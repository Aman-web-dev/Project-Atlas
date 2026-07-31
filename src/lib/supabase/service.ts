import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client.
 *
 * Use ONLY from server-side code (server actions, route handlers, server
 * components). Never import this from a client component. The service role
 * bypasses RLS, so every caller must verify auth.uid() === target user_id
 * before writing.
 *
 * Required for:
 *   - vault.secrets reads/writes (BYOK keys)
 *   - usage_events inserts (called from the user-facing server actions)
 */
export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. BYOK requires service-role access for vault.secrets.",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
