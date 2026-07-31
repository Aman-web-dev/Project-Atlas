import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Start generating ads in minutes — free during Phase 1
      </p>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
