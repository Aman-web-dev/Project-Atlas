import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 bg-gradient-radial from-white/5 to-transparent blur-3xl" />

      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-white to-zinc-400">
            <div className="h-3 w-3 rounded-sm bg-zinc-950" />
          </div>
          <span className="font-semibold">Atlas</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
