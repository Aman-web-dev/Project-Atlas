"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("email rate limit"))
    return "You've hit Supabase's email rate limit. Disable email confirmation in Authentication → Providers (or wait an hour), then try again.";
  if (m.includes("user already registered"))
    return "An account with that email already exists. Try signing in instead.";
  if (m.includes("password should be at least"))
    return "Password is too short. Use at least 6 characters.";
  if (m.includes("invalid email"))
    return "That doesn't look like a valid email address.";
  if (m.includes("signup disabled"))
    return "Signups are disabled on this project. Enable them in Authentication → Providers.";
  if (m.includes("invalid login credentials"))
    return "Wrong email or password. Try again.";

  return message;
}

function appOrigin(): string {
  // Allow either a configured public URL or the current request origin in dev.
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured.trim().length > 0) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: humanizeAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = (formData.get("password") as string) ?? "";
  const fullName = ((formData.get("full_name") as string) ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Email confirmation is disabled in dev (Supabase dashboard).
      // We still set a redirect URL for when it is re-enabled later.
      emailRedirectTo: `${appOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { error: humanizeAuthError(error.message) };
  }

  if (data.user) {
    // The profile row is created via the handle_new_user trigger on auth.users.
    redirect("/dashboard");
  }

  return { error: "Sign up did not return a user. Check your Supabase settings." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
