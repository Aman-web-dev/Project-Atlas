"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithEmail } from "../actions";

export function SignupForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await signUpWithEmail(formData);

      // Server Action may throw NEXT_REDIRECT when the action calls redirect().
      // In Next.js 15 that's a normal control-flow signal — we don't want to
      // surface it as a toast error.
      if (result?.error) {
        toast.error(result.error);
      } else {
        // When email confirmation is OFF, redirect runs and we never reach this.
        toast.success("Account created — check your email to confirm.");
      }
    } catch (err) {
      // Swallow "NEXT_REDIRECT" — it's how Server Actions navigate.
      // Other errors are unexpected.
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "";
      if (message.includes("NEXT_REDIRECT")) {
        return; // navigation is happening — just stop.
      }
      toast.error(message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
