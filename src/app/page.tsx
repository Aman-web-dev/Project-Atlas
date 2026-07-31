import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  PenLine,
  Image as ImageIcon,
  Layers,
  Send,
  BarChart3,
  Bot,
  Zap,
  Globe,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[1200px] -translate-x-1/2 bg-gradient-radial from-white/5 to-transparent blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-white to-zinc-400">
              <div className="h-3 w-3 rounded-sm bg-zinc-950" />
            </div>
            <span>Atlas</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#agents" className="transition-colors hover:text-foreground">
              Agents
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">
                Get started
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 border-border/60 bg-secondary/50">
            <Sparkles className="h-3 w-3" />
            Phase 1 — AI advertising is here
          </Badge>

          <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
            One interface for the{" "}
            <span className="text-gradient">entire advertising</span> ecosystem.
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
            Atlas is the AI-powered platform for creating ads, designing creatives, publishing
            campaigns, and letting autonomous agents optimize your spend — without ever leaving
            the dashboard.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-11 px-6">
              <Link href="/signup">
                Start for free
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-6">
              <Link href="#features">See it in action</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required · Powered by GPT, Gemini & Claude
          </p>
        </div>

        {/* Preview mock */}
        <div className="relative mt-20">
          <div className="absolute -inset-x-20 -inset-y-10 -z-10 bg-gradient-to-b from-transparent via-zinc-900/50 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-xl border border-border bg-zinc-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border/60 bg-zinc-950 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
                <div className="h-3 w-3 rounded-full bg-zinc-700" />
              </div>
              <div className="ml-3 flex h-6 flex-1 items-center justify-center rounded-md bg-zinc-900 px-3 text-xs text-muted-foreground">
                atlas.app/dashboard
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
              {[
                { label: "Copy generated", value: "1,284", icon: PenLine, trend: "+24%" },
                { label: "Creatives designed", value: "356", icon: ImageIcon, trend: "+12%" },
                { label: "Spend optimized", value: "$48.2K", icon: Zap, trend: "+38%" },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-900 p-6">
                  <div className="flex items-center justify-between">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="success" className="font-mono text-[10px]">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className="mt-3 text-3xl font-semibold">{stat.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-zinc-950/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-4xl font-semibold tracking-tight">
              From idea to live campaign — in minutes.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Atlas replaces every tool in your advertising stack with one unified, AI-native
              workspace.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: PenLine,
                title: "AI copy generation",
                description:
                  "Generate headlines, descriptions, and CTAs tuned for any platform and audience in seconds.",
              },
              {
                icon: ImageIcon,
                title: "AI image generation",
                description:
                  "Turn any product shot into on-brand ads in 1:1, 4:5, 16:9, and 9:16 — automatically.",
              },
              {
                icon: Layers,
                title: "Brand kit & assets",
                description:
                  "Store logos, fonts, colors, and product images. Atlas keeps every creative on-brand.",
              },
              {
                icon: Send,
                title: "Multi-platform publishing",
                description:
                  "Push a campaign live to Meta, Google, TikTok, LinkedIn, Pinterest, and more.",
              },
              {
                icon: BarChart3,
                title: "Unified analytics",
                description:
                  "Track impressions, CTR, conversions, ROAS — across every channel — in one view.",
              },
              {
                icon: Bot,
                title: "Autonomous agents",
                description:
                  "Creative Director, Media Buyer, Analyst, Audience, and Compliance agents that work 24/7.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-border/80 hover:bg-card/80"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
                  <feature.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              Agents
            </Badge>
            <h2 className="text-4xl font-semibold tracking-tight">An AI team that runs your ads.</h2>
            <p className="mt-4 text-muted-foreground">
              Five specialized agents that plan, execute, and optimize — while you stay in
              control.
            </p>
          </div>

          <div className="mt-12 space-y-2">
            {[
              {
                name: "Creative Director",
                role: "Tests variations, generates headlines, picks winners.",
                progress: 92,
              },
              {
                name: "Media Buyer",
                role: "Allocates budget, pauses weak campaigns, doubles down on winners.",
                progress: 78,
              },
              {
                name: "Analytics Agent",
                role: "Surfaces anomalies, builds reports, recommends next steps.",
                progress: 65,
              },
              {
                name: "Audience Agent",
                role: "Discovers segments, builds lookalikes, finds untapped demand.",
                progress: 54,
              },
              {
                name: "Compliance Agent",
                role: "Flags policy violations, prohibited content, and risky creatives.",
                progress: 88,
              },
            ].map((agent) => (
              <div
                key={agent.name}
                className="grid grid-cols-1 items-center gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-12"
              >
                <div className="md:col-span-3">
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">Always-on</div>
                </div>
                <div className="md:col-span-6 text-sm text-muted-foreground">{agent.role}</div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: `${agent.progress}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {agent.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">
            Ready to ship ads in minutes, not weeks?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join the early access. Generate your first campaign today — free during Phase 1.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button size="lg" asChild className="h-11 px-8">
              <Link href="/signup">
                Get early access
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              SOC 2 ready
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              GDPR compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              No card required
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-zinc-800">
              <div className="h-2 w-2 rounded-xs bg-zinc-400" />
            </div>
            <span>© {new Date().getFullYear()} Atlas</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
