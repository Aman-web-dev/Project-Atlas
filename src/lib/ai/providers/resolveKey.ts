import { getServiceClient } from "@/lib/supabase/service";
import type { Provider, Feature } from "./types";

/**
 * Reads a user's API key from Supabase Vault.
 *
 * Returns the plaintext key string. Only call this from server-side code
 * (server actions / route handlers). The result MUST NEVER be sent to the
 * client. Use it directly to call the provider, then discard.
 *
 * Implementation notes:
 *   - We look up the user's row in `user_api_keys` to get the `secret_id`.
 *   - We then call vault.read_secret() via RPC to retrieve the plaintext.
 *   - We touch `last_used_at` opportunistically (best-effort, errors swallowed).
 */

export interface ResolvedKey {
  secretId: string;
  provider: Provider;
  last4: string | null;
}

// ---------------------------------------------------------------------------
// Provider routing — pickProvider()
// ---------------------------------------------------------------------------
//
// Pick which provider to use for a given feature, based on which keys the
// user has configured. Priority order (first match wins):
//
//   copy:  minimax  →  openai
//   image: openai   →  minimax
//
// (MiniMax is preferred for copy because it's the cheapest chat model. OpenAI
// is preferred for image generation because gpt-image-1 is the most battle-
// tested for ad creatives.)

const COPY_PRIORITY: Provider[] = ["minimax", "openai", "anthropic", "google"];
const IMAGE_PRIORITY: Provider[] = ["openai", "minimax"];

export async function pickProvider(
  userId: string,
  feature: Feature,
): Promise<Provider | null> {
  const supabase = getServiceClient() as unknown as {
    from: (t: string) => any;
  };

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("provider")
    .eq("user_id", userId);

  if (error) return null;
  const available = new Set(
    ((data ?? []) as Array<{ provider: string }>).map((r) => r.provider),
  );

  const order = feature === "copy" ? COPY_PRIORITY : IMAGE_PRIORITY;
  for (const p of order) {
    if (available.has(p)) return p;
  }
  return null;
}

export async function resolveUserKey(
  userId: string,
  provider: Provider,
): Promise<string | null> {
  const supabase = getServiceClient() as unknown as {
    from: (t: string) => any;
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };

  const { data: row, error: rowErr } = await supabase
    .from("user_api_keys")
    .select("secret_id, verify_status")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (rowErr) {
    throw new Error((rowErr as { message?: string }).message ?? "Failed to read key row");
  }
  if (!row) return null;

  const secretId = (row as { secret_id?: string }).secret_id;
  if (!secretId) return null;

  // Read the secret from Vault via RPC.
  const { data: secret, error: secretErr } = await supabase.rpc("vault_read_secret", {
    secret_id: secretId,
  });

  if (secretErr) {
    // Some Supabase projects expose the secret as a column instead of an RPC.
    const { data: direct, error: directErr } = await supabase
      .from("secrets")
      .select("secret")
      .eq("id", secretId)
      .maybeSingle();

    if (directErr || !direct) {
      throw new Error(
        (secretErr as { message?: string })?.message || "Failed to read key from Vault",
      );
    }
    await touchLastUsed(secretId);
    return String((direct as { secret: string }).secret ?? "");
  }

  // vault.read_secret returns a table — pick the first row.
  const first = Array.isArray(secret) ? secret[0] : secret;
  const value = (first as { secret?: string } | null)?.secret;
  if (!value) return null;

  await touchLastUsed(secretId);
  return value;
}

async function touchLastUsed(secretId: string): Promise<void> {
  // Best-effort update; never block the call on this.
  try {
    const supabase = getServiceClient() as unknown as {
      from: (t: string) => any;
    };
    await supabase
      .from("user_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("secret_id", secretId);
  } catch {
    /* ignore */
  }
}
