import { createClient as createServerClient } from "./server";
import { getServiceClient } from "./service";
import type { Database } from "@/types/database";

// ============================================================================
// Dashboard analytics — real counts + week-over-week trend.
// All numbers come straight from Supabase. No prefilled dummy data.
// ============================================================================

export type StatTrend = {
  value: number;
  last7: number;
  prev7: number;
  /** Percentage change between last 7 days and the prior 7 days. */
  deltaPct: number;
};

export type DashboardStats = {
  copyGenerated: StatTrend;
  creativesDesigned: StatTrend;
  activeBrandKits: StatTrend;
  assetsInLibrary: StatTrend;
};

export type ActivityKind = "copy" | "image" | "asset" | "brand";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  text: string;
  createdAt: string;
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function computeDelta(last7: number, prev7: number): number {
  if (prev7 === 0) {
    if (last7 === 0) return 0;
    return 100; // Treat "from zero to something" as +100% to avoid divide-by-zero.
  }
  return Math.round(((last7 - prev7) / prev7) * 100);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function countRows(
  supabase: any,
  table: "generated_copy" | "assets" | "brand_kits",
  userId: string,
  filters: Array<[string, unknown]> = [],
  range?: { fromIso: string; toIso: string },
): Promise<number> {
  let q: any = supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (range) {
    q = q.gte("created_at", range.fromIso).lt("created_at", range.toIso);
  }
  for (const [col, val] of filters) {
    q = q.eq(col, val);
  }
  const res = await q;
  return (res?.count as number | null) ?? 0;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = await createServerClient();

  const now = isoDaysAgo(0);
  const d7 = isoDaysAgo(7);
  const d14 = isoDaysAgo(14);
  const last7 = { fromIso: d7, toIso: now };
  const prev7 = { fromIso: d14, toIso: d7 };

  // Totals (lifetime)
  const [copyTotal, generatedAssetsTotal, brandKitsTotal, assetsTotal] = await Promise.all([
    countRows(supabase, "generated_copy", userId),
    countRows(supabase, "assets", userId, [["type", "generated"]]),
    countRows(supabase, "brand_kits", userId),
    countRows(supabase, "assets", userId),
  ]);

  // Last 7 days
  const [copyL7, generatedL7, kitsL7, assetsL7] = await Promise.all([
    countRows(supabase, "generated_copy", userId, [], last7),
    countRows(supabase, "assets", userId, [["type", "generated"]], last7),
    countRows(supabase, "brand_kits", userId, [], last7),
    countRows(supabase, "assets", userId, [], last7),
  ]);

  // Previous 7 days (days -14..-7)
  const [copyP7, generatedP7, kitsP7, assetsP7] = await Promise.all([
    countRows(supabase, "generated_copy", userId, [], prev7),
    countRows(supabase, "assets", userId, [["type", "generated"]], prev7),
    countRows(supabase, "brand_kits", userId, [], prev7),
    countRows(supabase, "assets", userId, [], prev7),
  ]);

  return {
    copyGenerated: {
      value: copyTotal,
      last7: copyL7,
      prev7: copyP7,
      deltaPct: computeDelta(copyL7, copyP7),
    },
    creativesDesigned: {
      value: generatedAssetsTotal,
      last7: generatedL7,
      prev7: generatedP7,
      deltaPct: computeDelta(generatedL7, generatedP7),
    },
    activeBrandKits: {
      value: brandKitsTotal,
      last7: kitsL7,
      prev7: kitsP7,
      deltaPct: computeDelta(kitsL7, kitsP7),
    },
    assetsInLibrary: {
      value: assetsTotal,
      last7: assetsL7,
      prev7: assetsP7,
      deltaPct: computeDelta(assetsL7, assetsP7),
    },
  };
}

// ============================================================================
// Recent activity — merge latest rows from generated_copy, assets, brand_kits.
// ============================================================================

type CopyRow = Pick<
  Database["public"]["Tables"]["generated_copy"]["Row"],
  "id" | "product_name" | "headlines" | "descriptions" | "created_at"
>;

type AssetSlim = Pick<
  Database["public"]["Tables"]["assets"]["Row"],
  "id" | "name" | "type" | "created_at"
>;

type KitSlim = Pick<
  Database["public"]["Tables"]["brand_kits"]["Row"],
  "id" | "name" | "created_at" | "updated_at"
>;

export async function getRecentActivity(userId: string, limit = 8): Promise<ActivityItem[]> {
  const supabase = await createServerClient();

  const [copyRes, assetRes, kitRes] = await Promise.all([
    supabase
      .from("generated_copy")
      .select("id, product_name, headlines, descriptions, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("assets")
      .select("id, name, type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("brand_kits")
      .select("id, name, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  const copyRows = (copyRes.data ?? []) as CopyRow[];
  const assetRows = (assetRes.data ?? []) as AssetSlim[];
  const kitRows = (kitRes.data ?? []) as KitSlim[];

  const items: ActivityItem[] = [];

  for (const row of copyRows) {
    const headlineCount = row.headlines?.length ?? 0;
    const descCount = row.descriptions?.length ?? 0;
    const total = headlineCount + descCount;
    items.push({
      id: `copy-${row.id}`,
      kind: "copy",
      text: `Generated copy for "${row.product_name}" (${total} variations)`,
      createdAt: row.created_at,
    });
  }

  for (const row of assetRows) {
    if (row.type === "generated") {
      items.push({
        id: `image-${row.id}`,
        kind: "image",
        text: `Created ad creative "${row.name}"`,
        createdAt: row.created_at,
      });
    } else {
      items.push({
        id: `asset-${row.id}`,
        kind: "asset",
        text: `Added asset "${row.name}" to library`,
        createdAt: row.created_at,
      });
    }
  }

  for (const row of kitRows) {
    const ts = row.updated_at ?? row.created_at;
    if (ts === row.created_at) {
      items.push({
        id: `brand-${row.id}`,
        kind: "brand",
        text: `Created brand kit "${row.name}"`,
        createdAt: ts,
      });
    } else {
      items.push({
        id: `brand-${row.id}`,
        kind: "brand",
        text: `Updated brand kit "${row.name}"`,
        createdAt: ts,
      });
    }
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return items.slice(0, limit);
}

// ============================================================================
// Assets — read list, delete, upload to Supabase Storage + insert row.
// ============================================================================

export type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
export type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];

export async function listAssets(userId: string): Promise<AssetRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AssetRow[];
}

export async function deleteAsset(userId: string, assetId: string): Promise<void> {
  const supabase = await createServerClient();

  const { data: row, error: fetchErr } = await supabase
    .from("assets")
    .select("url")
    .eq("id", assetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);

  const url = (row as { url?: string } | null)?.url;
  if (url) {
    const marker = "/storage/v1/object/public/assets/";
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = url.slice(idx + marker.length);
      if (path.length > 0) {
        await supabase.storage.from("assets").remove([path]);
      }
    }
  }

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function uploadAsset(
  userId: string,
  file: File,
  kind: "image" | "video" | "logo" | "template" = "image",
): Promise<AssetRow> {
  const supabase = await createServerClient();

  const ext = file.name.split(".").pop() || (file.type.startsWith("video/") ? "mp4" : "png");
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error: uploadErr } = await supabase.storage
    .from("assets")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadErr) throw new Error(uploadErr.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("assets").getPublicUrl(path);

  const insertPayload: AssetInsert = {
    user_id: userId,
    name: file.name,
    type: kind,
    url: publicUrl,
    thumbnail_url: null,
    size_bytes: file.size,
    width: null,
    height: null,
    format: safeExt,
    tags: [],
    prompt: null,
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("assets") as any)
    .insert(insertPayload)
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (error) throw new Error(error.message);
  return data as AssetRow;
}

// ============================================================================
// Brand kits — read list, upsert.
// ============================================================================

export type BrandKitRow = Database["public"]["Tables"]["brand_kits"]["Row"];
export type BrandKitInsert = Database["public"]["Tables"]["brand_kits"]["Insert"];
export type BrandKitUpdate = Database["public"]["Tables"]["brand_kits"]["Update"];

export async function listBrandKits(userId: string): Promise<BrandKitRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BrandKitRow[];
}

export async function getActiveBrandKit(userId: string): Promise<BrandKitRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as BrandKitRow | null) ?? null;
}

export async function upsertBrandKit(
  userId: string,
  payload: {
    id?: string;
    name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_heading: string;
    font_body: string;
    logo_url: string | null;
  },
): Promise<BrandKitRow> {
  const supabase = await createServerClient();

  if (payload.id) {
    const updatePayload: BrandKitUpdate = {
      name: payload.name,
      primary_color: payload.primary_color,
      secondary_color: payload.secondary_color,
      accent_color: payload.accent_color,
      font_heading: payload.font_heading,
      font_body: payload.font_body,
      logo_url: payload.logo_url,
    };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data, error } = await (supabase.from("brand_kits") as any)
      .update(updatePayload)
      .eq("id", payload.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (error) throw new Error(error.message);
    return data as BrandKitRow;
  }

  const insertPayload: BrandKitInsert = {
    user_id: userId,
    name: payload.name,
    primary_color: payload.primary_color,
    secondary_color: payload.secondary_color,
    accent_color: payload.accent_color,
    font_heading: payload.font_heading,
    font_body: payload.font_body,
    logo_url: payload.logo_url,
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("brand_kits") as any)
    .insert(insertPayload)
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error(error.message);
  return data as BrandKitRow;
}

// ============================================================================
// Generated copy — insert (called by the Save-to-library button).
// ============================================================================

export async function saveGeneratedCopy(
  userId: string,
  payload: {
    product_name: string;
    product_description?: string;
    target_audience?: string;
    budget?: number;
    platform: string;
    headlines: string[];
    descriptions: string[];
    ctas: string[];
  },
): Promise<void> {
  const supabase = await createServerClient();
  const insertPayload = {
    user_id: userId,
    product_name: payload.product_name,
    product_description: payload.product_description ?? null,
    target_audience: payload.target_audience ?? null,
    budget: payload.budget ?? null,
    platform: payload.platform,
    headlines: payload.headlines,
    descriptions: payload.descriptions,
    ctas: payload.ctas,
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { error } = await (supabase.from("generated_copy") as any).insert(insertPayload);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error(error.message);
}

// ============================================================================
// Generated images — record (called by Save-to-library).
// We persist the data URL into Supabase Storage so the asset row has a
// real, permanent URL instead of a temporary in-memory data URL.
// ============================================================================

export async function saveGeneratedImage(
  userId: string,
  payload: {
    name: string;
    url: string;
    aspect_ratio: string;
    width: number;
    height: number;
    prompt: string;
  },
): Promise<AssetRow> {
  const supabase = await createServerClient();

  let publicUrl = payload.url;
  const format = payload.url.startsWith("data:image/svg")
    ? "svg"
    : payload.url.startsWith("data:image/png")
      ? "png"
      : payload.url.startsWith("data:image/jpeg")
        ? "jpg"
        : "png";

  if (payload.url.startsWith("data:")) {
    const base64 = payload.url.split(",")[1] ?? "";
    try {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: `image/${format}` });
      const path = `${userId}/generated/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${format}`;

      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, blob, { contentType: `image/${format}`, upsert: false });

      if (!upErr) {
        const {
          data: { publicUrl: storedUrl },
        } = supabase.storage.from("assets").getPublicUrl(path);
        publicUrl = storedUrl;
      }
    } catch {
      // Fall back to keeping the data URL if decoding/storage fails.
    }
  }

  const insertPayload: AssetInsert = {
    user_id: userId,
    name: payload.name,
    type: "generated",
    url: publicUrl,
    thumbnail_url: null,
    size_bytes: null,
    width: payload.width,
    height: payload.height,
    format,
    tags: ["generated"],
    prompt: payload.prompt,
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("assets") as any)
    .insert(insertPayload)
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (error) throw new Error(error.message);
  return data as AssetRow;
}

// ============================================================================
// BYOK: user_api_keys (vault-backed), user_quotas, usage_events
// ============================================================================

export type ApiKeyRow = Database["public"]["Tables"]["user_api_keys"]["Row"];
export type QuotaRow = Database["public"]["Tables"]["user_quotas"]["Row"];
export type UsageEventRow = Database["public"]["Tables"]["usage_events"]["Row"];

/** All providers Atlas knows about. */
export type Provider = "openai" | "anthropic" | "google" | "minimax";
export type Feature = "copy" | "image";

// ----- Quotas ---------------------------------------------------------------

export async function getUserQuotas(userId: string): Promise<QuotaRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("user_quotas")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data as QuotaRow;

  // No row yet — create one with defaults. Uses the user JWT (RLS insert).
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: inserted, error: insErr } = await (supabase.from("user_quotas") as any)
    .insert({ user_id: userId })
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (insErr) throw new Error(insErr.message);
  return inserted as QuotaRow;
}

export async function updateUserQuotas(
  userId: string,
  patch: Partial<
    Pick<
      QuotaRow,
      "monthly_budget_usd" | "copy_budget_usd" | "image_budget_usd" | "monthly_request_cap" | "enforce_caps"
    >
  >,
): Promise<QuotaRow> {
  const supabase = await createServerClient();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("user_quotas") as any)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error(error.message);
  return data as QuotaRow;
}

// ----- API keys -------------------------------------------------------------

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ApiKeyRow[];
}

/**
 * Store a key in Vault and link it to a user_api_keys row.
 * Service-role only — vault.secrets is not writable by anon.
 */
export async function createApiKey(params: {
  userId: string;
  provider: Provider;
  apiKey: string;
  label?: string;
}): Promise<ApiKeyRow> {
  const supabase = getServiceClient() as ReturnType<typeof getServiceClient> & {
    rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
  const last4 = params.apiKey.slice(-4);

  // 1. Store the secret in Vault.
  const secretName = `atlas-${params.userId}-${params.provider}-${Date.now()}`;
  const { data: secretId, error: vaultErr } = await supabase.rpc("vault_create_secret", {
    secret: params.apiKey,
    name: secretName,
  });

  let resolvedSecretId: string;
  if (vaultErr || !secretId) {
    throw new Error(
      (vaultErr as { message?: string } | null)?.message ||
        "Failed to write secret to vault. Make sure the vault_create_secret RPC exists.",
    );
  }
  resolvedSecretId = String(secretId);

  // 2. Replace any existing row for this (user, provider).
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const existing = await (supabase.from("user_api_keys") as any)
    .select("id")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .maybeSingle();
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (existing?.data) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data, error } = await (supabase.from("user_api_keys") as any)
      .update({
        secret_id: resolvedSecretId,
        key_last4: last4,
        label: params.label ?? null,
        verify_status: "unknown",
        verify_message: null,
        last_verified_at: null,
      })
      .eq("id", (existing.data as { id: string }).id)
      .select("*")
      .single();
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (error) throw new Error((error as { message?: string }).message ?? "Update failed");
    return data as ApiKeyRow;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("user_api_keys") as any)
    .insert({
      user_id: params.userId,
      provider: params.provider,
      secret_id: resolvedSecretId,
      key_last4: last4,
      label: params.label ?? null,
    })
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error((error as { message?: string }).message ?? "Insert failed");
  return data as ApiKeyRow;
}

export async function deleteApiKey(userId: string, id: string): Promise<void> {
  const supabase = getServiceClient();
  const { data: row, error: fetchErr } = await supabase
    .from("user_api_keys")
    .select("secret_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);

  const secretId = (row as { secret_id?: string } | null)?.secret_id;
  if (secretId) {
    // Best-effort: also delete the underlying Vault secret.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (supabase as any).rpc("vault_delete_secret", { secret_id: secretId }).then(
      () => undefined,
      () => undefined,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function markApiKeyVerified(
  userId: string,
  id: string,
  ok: boolean,
  message: string | null,
): Promise<void> {
  const supabase = getServiceClient();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  await (supabase.from("user_api_keys") as any)
    .update({
      verify_status: ok ? "ok" : "invalid",
      verify_message: message,
      last_verified_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// ----- Usage events ---------------------------------------------------------

export async function recordUsageEvent(event: {
  userId: string;
  feature: Feature;
  provider: Provider | string;
  model: string;
  status: "ok" | "error" | "denied";
  httpStatus?: number;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  estCostUsd?: number;
  promptChars?: number;
  errorCode?: string;
}): Promise<void> {
  const supabase = getServiceClient();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  await (supabase.from("usage_events") as any).insert({
    user_id: event.userId,
    feature: event.feature,
    provider: event.provider,
    model: event.model,
    status: event.status,
    http_status: event.httpStatus ?? null,
    input_tokens: event.inputTokens ?? 0,
    output_tokens: event.outputTokens ?? 0,
    image_count: event.imageCount ?? 0,
    est_cost_usd: event.estCostUsd ?? 0,
    prompt_chars: event.promptChars ?? null,
    error_code: event.errorCode ?? null,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function getMonthlyUsage(
  userId: string,
  monthStartIso: string,
): Promise<{
  total: { requests: number; est_cost_usd: number; images: number };
  byFeature: {
    feature: Feature;
    requests: number;
    est_cost_usd: number;
    images: number;
  }[];
}> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("usage_events")
    .select("feature, status, input_tokens, output_tokens, image_count, est_cost_usd")
    .eq("user_id", userId)
    .gte("created_at", monthStartIso);

  if (error) throw new Error(error.message);

  const okRows = (data ?? []).filter(
    (r) => (r as { status: string }).status === "ok",
  ) as Array<{
    feature: Feature;
    status: "ok" | "error" | "denied";
    input_tokens: number;
    output_tokens: number;
    image_count: number;
    est_cost_usd: number;
  }>;

  const byFeature = new Map<
    Feature,
    { requests: number; est_cost_usd: number; images: number }
  >();
  let totalRequests = 0;
  let totalCost = 0;
  let totalImages = 0;
  for (const row of okRows) {
    totalRequests += 1;
    totalCost += Number(row.est_cost_usd ?? 0);
    totalImages += row.image_count ?? 0;
    const cur = byFeature.get(row.feature) ?? { requests: 0, est_cost_usd: 0, images: 0 };
    cur.requests += 1;
    cur.est_cost_usd += Number(row.est_cost_usd ?? 0);
    cur.images += row.image_count ?? 0;
    byFeature.set(row.feature, cur);
  }
  return {
    total: { requests: totalRequests, est_cost_usd: totalCost, images: totalImages },
    byFeature: Array.from(byFeature.entries()).map(([feature, v]) => ({ feature, ...v })),
  };
}

export async function getDailyUsage(
  userId: string,
  daysBack: number,
): Promise<Array<{ day: string; est_cost_usd: number; requests: number }>> {
  const supabase = await createServerClient();
  const since = isoDaysAgo(daysBack);
  const { data, error } = await supabase
    .from("usage_events")
    .select("created_at, est_cost_usd, status")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  // Bucket by YYYY-MM-DD.
  const buckets = new Map<string, { est_cost_usd: number; requests: number }>();
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), { est_cost_usd: 0, requests: 0 });
  }
  for (const row of data ?? []) {
    const r = row as { created_at: string; est_cost_usd: number; status: string };
    if (r.status !== "ok") continue;
    const day = r.created_at.slice(0, 10);
    const cur = buckets.get(day);
    if (cur) {
      cur.est_cost_usd += Number(r.est_cost_usd ?? 0);
      cur.requests += 1;
    }
  }
  return Array.from(buckets.entries()).map(([day, v]) => ({ day, ...v }));
}

export async function getRecentUsageEvents(
  userId: string,
  limit = 50,
): Promise<UsageEventRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("usage_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as UsageEventRow[];
}

// ============================================================================
// Personas (Ideal Customer Profiles)
// ============================================================================

export type PersonaRow = Database["public"]["Tables"]["personas"]["Row"];
export type PersonaInsert = Database["public"]["Tables"]["personas"]["Insert"];
export type PersonaUpdate = Database["public"]["Tables"]["personas"]["Update"];

export async function listPersonas(userId: string): Promise<PersonaRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PersonaRow[];
}

export async function getPersona(userId: string, id: string): Promise<PersonaRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as PersonaRow | null) ?? null;
}

export async function getDefaultPersona(userId: string): Promise<PersonaRow | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as PersonaRow | null) ?? null;
}

export async function createPersona(
  userId: string,
  payload: {
    name: string;
    demographics?: string;
    desires?: string;
    problems?: string;
    voice_of_customer?: string;
    notes?: string;
    is_default?: boolean;
  },
): Promise<PersonaRow> {
  const supabase = await createServerClient();
  const insertPayload: PersonaInsert = {
    user_id: userId,
    name: payload.name,
    demographics: payload.demographics ?? null,
    desires: payload.desires ?? "",
    problems: payload.problems ?? "",
    voice_of_customer: payload.voice_of_customer ?? "",
    notes: payload.notes ?? null,
    is_default: payload.is_default ?? false,
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("personas") as any)
    .insert(insertPayload)
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error(error.message);
  return data as PersonaRow;
}

export async function updatePersona(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      PersonaRow,
      | "name"
      | "demographics"
      | "desires"
      | "problems"
      | "voice_of_customer"
      | "notes"
      | "is_default"
    >
  >,
): Promise<PersonaRow> {
  const supabase = await createServerClient();
  const updatePayload: PersonaUpdate = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.demographics !== undefined ? { demographics: patch.demographics } : {}),
    ...(patch.desires !== undefined ? { desires: patch.desires } : {}),
    ...(patch.problems !== undefined ? { problems: patch.problems } : {}),
    ...(patch.voice_of_customer !== undefined
      ? { voice_of_customer: patch.voice_of_customer }
      : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.is_default !== undefined ? { is_default: patch.is_default } : {}),
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase.from("personas") as any)
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error(error.message);
  return data as PersonaRow;
}

export async function deletePersona(userId: string, id: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("personas")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setDefaultPersona(userId: string, id: string): Promise<PersonaRow> {
  return updatePersona(userId, id, { is_default: true });
}
