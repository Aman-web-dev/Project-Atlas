"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  markApiKeyVerified,
  type ApiKeyRow,
  type Provider,
} from "@/lib/supabase/queries";
import { resolveUserKey } from "@/lib/ai/providers/resolveKey";
import { openaiVerify } from "@/lib/ai/providers/openai";
import { minimaxVerify } from "@/lib/ai/providers/minimax";

// ============================================================================
// Read
// ============================================================================

export async function fetchApiKeysAction(): Promise<ApiKeyRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listApiKeys(user.id);
}

// ============================================================================
// Add / replace
// ============================================================================

export async function addApiKeyAction(input: {
  provider: Provider;
  apiKey: string;
  label?: string;
}): Promise<
  | { ok: true; row: ApiKeyRow }
  | { ok: false; error: string; code?: "invalid_key" | "no_supabase_service_role" | "vault_unavailable" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      code: "no_supabase_service_role",
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it to .env to enable BYOK.",
    };
  }

  const trimmed = input.apiKey.trim();
  if (trimmed.length < 8) {
    return { ok: false, code: "invalid_key", error: "That key looks too short." };
  }

  try {
    const row = await createApiKey({
      userId: user.id,
      provider: input.provider,
      apiKey: trimmed,
      label: input.label,
    });
    revalidatePath("/dashboard/settings/api-keys");
    revalidatePath("/dashboard/settings/usage");
    return { ok: true, row };
  } catch (err) {
    const message = (err as Error).message;
    if (/vault/i.test(message)) {
      return { ok: false, code: "vault_unavailable", error: message };
    }
    return { ok: false, error: message };
  }
}

// ============================================================================
// Verify (cheap ping)
// ============================================================================

export async function verifyApiKeyAction(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Not signed in." };

  // Look up which provider this key is for, then resolve + verify with the
  // matching implementation.
  const keys = listApiKeys(user.id);
  const all = await keys;
  const row = all.find((k) => k.id === id);
  if (!row) return { ok: false, reason: "Key not found." };

  let key: string | null = null;
  try {
    key = await resolveUserKey(user.id, row.provider);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  if (!key) return { ok: false, reason: `No ${row.provider} key on file.` };

  const result =
    row.provider === "minimax"
      ? await minimaxVerify(key)
      : row.provider === "openai"
        ? await openaiVerify(key)
        : { ok: false as const, reason: `Verification not implemented for ${row.provider}` };

  await markApiKeyVerified(user.id, id, result.ok, result.ok ? null : result.reason);
  revalidatePath("/dashboard/settings/api-keys");
  return result;
}

// ============================================================================
// Delete
// ============================================================================

export async function deleteApiKeyAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    await deleteApiKey(user.id, id);
    revalidatePath("/dashboard/settings/api-keys");
    revalidatePath("/dashboard/generate/copy");
    revalidatePath("/dashboard/generate/image");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
