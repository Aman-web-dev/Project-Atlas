/**
 * Shared enforcement helpers for the BYOK server actions.
 *
 * Each call goes through:
 *   1. pickProvider()        — pick the best provider the user has a key for
 *   2. resolveUserKey()      — pull that key from Supabase Vault
 *   3. assertWithinCap()     — enforce monthly USD / per-feature / request caps
 *   4. provider.*            — call the provider with the user's key
 *   5. recordUsageEvent()    — append a row to usage_events (ok / error / denied)
 *
 * Every step is fully typed and never leaks the API key to the client.
 */

import { revalidatePath } from "next/cache";
import {
  getUserQuotas,
  getMonthlyUsage,
  recordUsageEvent,
  type Feature,
  type Provider,
  type QuotaRow,
} from "@/lib/supabase/queries";
import { estimateCost } from "./providers/pricing";
import { pickProvider, resolveUserKey } from "./providers/resolveKey";
import {
  openaiChat,
  openaiImages,
  OPENAI_COPY_MODEL,
  OPENAI_IMAGE_MODEL,
} from "./providers/openai";
import {
  minimaxChat,
  minimaxImages,
  MINIMAX_COPY_MODEL,
  MINIMAX_IMAGE_MODEL,
} from "./providers/minimax";

export type MonthSummary = {
  requests: number;
  est_cost_usd: number;
  images: number;
};

export type CapCheckResult =
  | { ok: true; quota: QuotaRow; month: MonthSummary }
  | {
      ok: false;
      reason: "over_budget" | "over_requests" | "over_feature_budget";
      used: number;
      limit: number;
      scope: string;
    };

function monthStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function assertWithinCap(
  userId: string,
  feature: Feature,
): Promise<CapCheckResult> {
  const [quota, usage] = await Promise.all([
    getUserQuotas(userId),
    getMonthlyUsage(userId, monthStartIso()),
  ]);
  const month = usage.total;

  if (!quota.enforce_caps) {
    return { ok: true, quota, month };
  }

  if (month.requests + 1 > quota.monthly_request_cap) {
    return {
      ok: false,
      reason: "over_requests",
      used: month.requests,
      limit: quota.monthly_request_cap,
      scope: "monthly",
    };
  }

  if (month.est_cost_usd >= Number(quota.monthly_budget_usd)) {
    return {
      ok: false,
      reason: "over_budget",
      used: month.est_cost_usd,
      limit: Number(quota.monthly_budget_usd),
      scope: "monthly",
    };
  }

  const featureBudget =
    feature === "copy"
      ? Number(quota.copy_budget_usd)
      : Number(quota.image_budget_usd);
  const featureUsed =
    usage.byFeature.find((f) => f.feature === feature)?.est_cost_usd ?? 0;
  if (featureUsed >= featureBudget) {
    return {
      ok: false,
      reason: "over_feature_budget",
      used: featureUsed,
      limit: featureBudget,
      scope: feature,
    };
  }

  return { ok: true, quota, month };
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export interface GenerateCopyResult {
  ok: boolean;
  /** Generated structured copy. */
  headlines: string[];
  descriptions: string[];
  ctas: string[];
  /** Final estimated cost in USD for this call. */
  costUsd: number;
  /** When the user has no key configured. */
  reason?: "no_key";
  /** When the user has hit a cap. */
  cap?: { reason: string; used: number; limit: number; scope: string };
  /** Which provider ended up handling the call. Useful for telemetry / UI. */
  provider?: Provider;
  error?: string;
}

export async function executeCopy(params: {
  userId: string;
  system: string;
  user: string;
  json: boolean;
}): Promise<GenerateCopyResult> {
  // 1. Pick a provider the user has configured.
  const provider = await pickProvider(params.userId, "copy");
  if (!provider) {
    return { ok: false, reason: "no_key", headlines: [], descriptions: [], ctas: [], costUsd: 0 };
  }

  // 2. Resolve the key.
  const apiKey = await resolveUserKey(params.userId, provider);
  if (!apiKey) {
    return { ok: false, reason: "no_key", headlines: [], descriptions: [], ctas: [], costUsd: 0 };
  }

  // 3. Cap check.
  const cap = await assertWithinCap(params.userId, "copy");
  if (!cap.ok) {
    await recordUsageEvent({
      userId: params.userId,
      feature: "copy",
      provider,
      model: provider === "minimax" ? MINIMAX_COPY_MODEL : OPENAI_COPY_MODEL,
      status: "denied",
      errorCode: cap.reason,
    });
    revalidatePath("/dashboard/settings/usage");
    return {
      ok: false,
      cap: { reason: cap.reason, used: cap.used, limit: cap.limit, scope: cap.scope },
      headlines: [],
      descriptions: [],
      ctas: [],
      costUsd: 0,
    };
  }

  // 4. Call the provider.
  let chat;
  try {
    if (provider === "minimax") {
      chat = await minimaxChat(apiKey, {
        system: params.system,
        user: params.user,
        jsonMode: params.json,
      });
    } else if (provider === "openai") {
      chat = await openaiChat(apiKey, {
        system: params.system,
        user: params.user,
        jsonMode: params.json,
      });
    } else {
      throw new Error(`Provider ${provider} not implemented for copy yet`);
    }
  } catch (err) {
    const pe = err as { status?: number; code?: string; message?: string };
    await recordUsageEvent({
      userId: params.userId,
      feature: "copy",
      provider,
      model: provider === "minimax" ? MINIMAX_COPY_MODEL : OPENAI_COPY_MODEL,
      status: "error",
      httpStatus: pe.status,
      promptChars: params.user.length,
      errorCode: pe.code ?? "provider",
    });
    revalidatePath("/dashboard/settings/usage");
    return {
      ok: false,
      error: pe.message || "Provider error",
      headlines: [],
      descriptions: [],
      ctas: [],
      costUsd: 0,
    };
  }

  // 5. Parse + record.
  let parsed: { headlines?: string[]; descriptions?: string[]; ctas?: string[] } = {};
  if (params.json) {
    try {
      parsed = JSON.parse(chat.text);
    } catch {
      // Try a permissive extraction if the model wrapped the JSON in prose.
      const match = chat.text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }
  }

  const model = provider === "minimax" ? MINIMAX_COPY_MODEL : OPENAI_COPY_MODEL;
  const cost = estimateCost(
    provider,
    model,
    chat.usage.input_tokens,
    chat.usage.output_tokens,
    0,
  );

  await recordUsageEvent({
    userId: params.userId,
    feature: "copy",
    provider,
    model,
    status: "ok",
    inputTokens: chat.usage.input_tokens,
    outputTokens: chat.usage.output_tokens,
    estCostUsd: cost,
    promptChars: params.user.length,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings/usage");

  return {
    ok: true,
    headlines: parsed.headlines ?? [],
    descriptions: parsed.descriptions ?? [],
    ctas: parsed.ctas ?? [],
    costUsd: cost,
    provider,
  };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export interface GenerateImagesResult {
  ok: boolean;
  images: Array<{
    id: string;
    url: string;
    aspectRatio: string;
    width: number;
    height: number;
    prompt: string;
  }>;
  costUsd: number;
  reason?: "no_key";
  cap?: { reason: string; used: number; limit: number; scope: string };
  provider?: Provider;
  error?: string;
}

export async function executeImages(params: {
  userId: string;
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "16:9" | "9:16";
  style?: string;
  count: number;
  referenceImage?: string;
}): Promise<GenerateImagesResult> {
  // 1. Pick provider (OpenAI preferred for images, falls back to MiniMax).
  const provider = await pickProvider(params.userId, "image");
  if (!provider) {
    return { ok: false, reason: "no_key", images: [], costUsd: 0 };
  }

  const apiKey = await resolveUserKey(params.userId, provider);
  if (!apiKey) {
    return { ok: false, reason: "no_key", images: [], costUsd: 0 };
  }

  const cap = await assertWithinCap(params.userId, "image");
  if (!cap.ok) {
    await recordUsageEvent({
      userId: params.userId,
      feature: "image",
      provider,
      model: provider === "minimax" ? MINIMAX_IMAGE_MODEL : OPENAI_IMAGE_MODEL,
      status: "denied",
      errorCode: cap.reason,
      imageCount: params.count,
    });
    revalidatePath("/dashboard/settings/usage");
    return {
      ok: false,
      cap: { reason: cap.reason, used: cap.used, limit: cap.limit, scope: cap.scope },
      images: [],
      costUsd: 0,
    };
  }

  let imgs;
  try {
    if (provider === "minimax") {
      imgs = await minimaxImages(apiKey, {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        style: params.style,
        count: params.count,
        referenceImage: params.referenceImage,
      });
    } else if (provider === "openai") {
      imgs = await openaiImages(apiKey, {
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        style: params.style,
        count: params.count,
        referenceImage: params.referenceImage,
      });
    } else {
      throw new Error(`Provider ${provider} not implemented for image yet`);
    }
  } catch (err) {
    const pe = err as { status?: number; code?: string; message?: string };
    await recordUsageEvent({
      userId: params.userId,
      feature: "image",
      provider,
      model: provider === "minimax" ? MINIMAX_IMAGE_MODEL : OPENAI_IMAGE_MODEL,
      status: "error",
      httpStatus: pe.status,
      imageCount: params.count,
      promptChars: params.prompt.length,
      errorCode: pe.code ?? "provider",
    });
    revalidatePath("/dashboard/settings/usage");
    return {
      ok: false,
      error: pe.message || "Provider error",
      images: [],
      costUsd: 0,
    };
  }

  const imageCount = imgs.length;
  const model = provider === "minimax" ? MINIMAX_IMAGE_MODEL : OPENAI_IMAGE_MODEL;
  const cost = estimateCost(provider, model, 0, 0, imageCount);

  await recordUsageEvent({
    userId: params.userId,
    feature: "image",
    provider,
    model,
    status: "ok",
    imageCount,
    estCostUsd: cost,
    promptChars: params.prompt.length,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings/usage");

  return {
    ok: true,
    images: imgs.map((img, idx) => ({
      id: `${Date.now()}_${idx}`,
      url: img.url,
      aspectRatio: params.aspectRatio,
      width: img.width,
      height: img.height,
      prompt: img.prompt,
    })),
    costUsd: cost,
    provider,
  };
}
