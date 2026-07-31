import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Sign in to your Atlas account
      </p>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
