import Link from "next/link";
import {
  PenLine,
  Image as ImageIcon,
  Layers,
  Library,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardStats,
  getRecentActivity,
  type StatTrend,
  type ActivityItem,
} from "@/lib/supabase/queries";
import { formatRelativeTime } from "@/lib/utils";

function formatStatValue(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("en-US");
  }
  return String(n);
}

function trendLabel(stat: StatTrend): string {
  const sign = stat.deltaPct > 0 ? "+" : "";
  return `${sign}${stat.deltaPct}%`;
}

function trendDirection(stat: StatTrend): "up" | "down" | "neutral" {
  if (stat.deltaPct > 0) return "up";
  if (stat.deltaPct < 0) return "down";
  return "neutral";
}

function trendDescription(stat: StatTrend): string {
  if (stat.last7 === 0 && stat.prev7 === 0) return "no activity yet";
  return `vs ${stat.prev7} in previous 7 days`;
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let activity: ActivityItem[] = [];

  try {
    [stats, activity] = await Promise.all([getDashboardStats(user.id), getRecentActivity(user.id, 6)]);
  } catch (err) {
    // If analytics queries fail, render a graceful empty state instead of
    // crashing the whole dashboard.
    console.error("Failed to load dashboard analytics", err);
    stats = {
      copyGenerated: { value: 0, last7: 0, prev7: 0, deltaPct: 0 },
      creativesDesigned: { value: 0, last7: 0, prev7: 0, deltaPct: 0 },
      activeBrandKits: { value: 0, last7: 0, prev7: 0, deltaPct: 0 },
      assetsInLibrary: { value: 0, last7: 0, prev7: 0, deltaPct: 0 },
    };
  }

  const statCards: { label: string; value: number; icon: LucideIcon; trend: StatTrend }[] = [
    { label: "Copy generated", value: stats.copyGenerated.value, icon: PenLine, trend: stats.copyGenerated },
    { label: "Creatives designed", value: stats.creativesDesigned.value, icon: ImageIcon, trend: stats.creativesDesigned },
    { label: "Active brand kits", value: stats.activeBrandKits.value, icon: Layers, trend: stats.activeBrandKits },
    { label: "Assets in library", value: stats.assetsInLibrary.value, icon: Library, trend: stats.assetsInLibrary },
  ];

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening across your account today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/brand-kit">
              <Layers className="h-4 w-4" />
              Brand kit
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/generate/copy">
              <Sparkles className="h-4 w-4" />
              Generate copy
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats — all numbers and trends come from Supabase. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((s) => {
          const direction = trendDirection(s.trend);
          const label = trendLabel(s.trend);
          return (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  {direction === "up" && (
                    <Badge variant="success" className="font-mono text-[10px]">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {label}
                    </Badge>
                  )}
                  {direction === "down" && (
                    <Badge variant="destructive" className="font-mono text-[10px]">
                      <TrendingDown className="mr-1 h-3 w-3" />
                      {label}
                    </Badge>
                  )}
                  {direction === "neutral" && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      <Minus className="mr-1 h-3 w-3" />
                      {label}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 text-2xl font-semibold">
                  {formatStatValue(s.value)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.label} · <span className="text-muted-foreground/80">{trendDescription(s.trend)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group hover:border-border/80">
          <CardHeader>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
              <PenLine className="h-4 w-4" />
            </div>
            <CardTitle className="mt-4">AI copy generation</CardTitle>
            <CardDescription>
              Generate on-brand headlines, descriptions, and CTAs in seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full justify-between">
              <Link href="/dashboard/generate/copy">
                Open
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:border-border/80">
          <CardHeader>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
              <ImageIcon className="h-4 w-4" />
            </div>
            <CardTitle className="mt-4">AI image generation</CardTitle>
            <CardDescription>
              Turn product shots into on-brand ads in 1:1, 4:5, 16:9 and 9:16.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full justify-between">
              <Link href="/dashboard/generate/image">
                Open
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group hover:border-border/80">
          <CardHeader>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
              <Library className="h-4 w-4" />
            </div>
            <CardTitle className="mt-4">Asset library</CardTitle>
            <CardDescription>
              Manage every image, video, and template you've generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full justify-between">
              <Link href="/dashboard/assets">
                Open
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity — pulled from Supabase, no hard-coded rows. */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Your latest generated copy, assets and brand-kit edits</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/60 px-6 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="mt-3 text-sm font-medium">No activity yet</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Generate a piece of copy, design a creative, or update your brand kit — your
                latest work will appear here.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/dashboard/generate/copy">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate copy
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">{row.text}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatRelativeTime(row.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
