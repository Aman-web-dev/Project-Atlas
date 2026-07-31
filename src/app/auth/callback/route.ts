import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase email-confirmation / OAuth callback.
 *
 * When the project is configured to require email confirmation, Supabase
 * redirects users here with `?code=...`. We exchange it for a session cookie
 * then forward them into the dashboard.
 *
 * In dev (with email confirmation OFF) Supabase just signs the user in
 * directly via Server Actions, so this route is rarely hit — but having
 * it here keeps production deployment paths working.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Fallback: send them to login with an error hint.
  return NextResponse.redirect(new URL(`/login?error=confirmation_failed`, url.origin));
}
