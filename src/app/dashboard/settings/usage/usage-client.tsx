"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { CheckCircle2, AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import type { QuotaRow, UsageEventRow, Feature } from "@/lib/supabase/queries";
import { formatRelativeTime } from "@/lib/utils";
import { fetchUsageAction, updateQuotasAction, type UsageSnapshot } from "./actions";

export function UsageClient({
  initial,
}: {
  initial: UsageSnapshot & { hasKey: boolean };
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  // Local form state for the cap editor.
  const [form, setForm] = useState({
    monthly_budget_usd: String(initial.quota.monthly_budget_usd),
    copy_budget_usd: String(initial.quota.copy_budget_usd),
    image_budget_usd: String(initial.quota.image_budget_usd),
    monthly_request_cap: String(initial.quota.monthly_request_cap),
    enforce_caps: initial.quota.enforce_caps,
  });

  async function refresh() {
    const fresh = await fetchUsageAction();
    if (fresh) setSnapshot({ ...fresh, hasKey: snapshot.hasKey });
  }

  async function saveCaps() {
    setSaving(true);
    try {
      const res = await updateQuotasAction({
        monthly_budget_usd: Number(form.monthly_budget_usd),
        copy_budget_usd: Number(form.copy_budget_usd),
        image_budget_usd: Number(form.image_budget_usd),
        monthly_request_cap: Number(form.monthly_request_cap),
        enforce_caps: form.enforce_caps,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Caps saved");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  const pct = useMemo(() => {
    if (snapshot.quota.monthly_budget_usd <= 0) return 0;
    return Math.min(
      100,
      Math.round((snapshot.month.est_cost_usd / Number(snapshot.quota.monthly_budget_usd)) * 100),
    );
  }, [snapshot.month.est_cost_usd, snapshot.quota.monthly_budget_usd]);

  const projectedEom = useMemo(() => {
    const now = new Date();
    const dayOfMonth = now.getUTCDate();
    const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
    if (dayOfMonth === 0) return snapshot.month.est_cost_usd;
    return (snapshot.month.est_cost_usd / dayOfMonth) * daysInMonth;
  }, [snapshot.month.est_cost_usd]);

  return (
    <div className="space-y-6">
      {!snapshot.hasKey && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
            <div>
              <p className="font-medium">No API key configured</p>
              <p className="text-muted-foreground">
                Add one in{" "}
                <a className="underline" href="/dashboard/settings/api-keys">
                  API keys
                </a>{" "}
                to start generating. Until then your usage will stay flat.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top metric cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="MTD spend"
          value={`$${snapshot.month.est_cost_usd.toFixed(2)}`}
          sub={`of $${Number(snapshot.quota.monthly_budget_usd).toFixed(2)} cap`}
          tone={pct >= 90 ? "red" : pct >= 75 ? "amber" : "default"}
        />
        <MetricCard
          label="MTD requests"
          value={String(snapshot.month.requests)}
          sub={`of ${snapshot.quota.monthly_request_cap} cap`}
        />
        <MetricCard
          label="MTD images"
          value={String(snapshot.month.images)}
          sub="generated"
        />
        <MetricCard
          label="Projected EOM"
          value={`$${projectedEom.toFixed(2)}`}
          sub="at current pace"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily spend</CardTitle>
          <CardDescription>Last 30 days · USD estimated from provider usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.daily}>
                <defs>
                  <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                  tickFormatter={(d: string) => d.slice(5)}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                  formatter={(value) => [
                    `$${typeof value === "number" ? value.toFixed(4) : Number(value ?? 0).toFixed(4)}`,
                    "Spend",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="est_cost_usd"
                  stroke="currentColor"
                  strokeWidth={2}
                  fill="url(#cost)"
                  className="text-emerald-500"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cap editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caps</CardTitle>
          <CardDescription>
            Atlas denies any call that would breach these limits. Set them to whatever you're
            comfortable spending this month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CapField
              label="Monthly budget"
              help="Hard ceiling in USD across all features."
              value={form.monthly_budget_usd}
              onChange={(v) => setForm({ ...form, monthly_budget_usd: v })}
              suffix="USD"
            />
            <CapField
              label="Monthly request cap"
              help="Total API calls allowed this month."
              value={form.monthly_request_cap}
              onChange={(v) => setForm({ ...form, monthly_request_cap: v })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CapField
              label="Copy budget"
              help="USD reserved for AI Copy generations."
              value={form.copy_budget_usd}
              onChange={(v) => setForm({ ...form, copy_budget_usd: v })}
              suffix="USD"
            />
            <CapField
              label="Image budget"
              help="USD reserved for AI Image generations."
              value={form.image_budget_usd}
              onChange={(v) => setForm({ ...form, image_budget_usd: v })}
              suffix="USD"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="enforce" className="flex items-center gap-2 text-sm">
                <Lock className="h-3.5 w-3.5" />
                Enforce caps
              </Label>
              <p className="text-xs text-muted-foreground">
                When off, Atlas will still log usage but allow every request.
              </p>
            </div>
            <Switch
              id="enforce"
              checked={form.enforce_caps}
              onCheckedChange={(v) => setForm({ ...form, enforce_caps: v })}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={saveCaps} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save caps
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent events table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent calls</CardTitle>
          <CardDescription>Last {snapshot.recent.length} events from this account.</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No calls yet. Once you generate copy or images, you'll see them here.
            </p>
          ) : (
            <div className="space-y-2">
              {snapshot.recent.map((ev) => (
                <EventRow key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-feature meters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["copy", "image"] as const).map((f) => {
          const used = snapshot.byFeature.find((x) => x.feature === f)?.est_cost_usd ?? 0;
          const limit =
            f === "copy"
              ? Number(snapshot.quota.copy_budget_usd)
              : Number(snapshot.quota.image_budget_usd);
          return (
            <Card key={f}>
              <CardHeader>
                <CardTitle className="capitalize">{f} budget</CardTitle>
                <CardDescription>This month · estimated USD</CardDescription>
              </CardHeader>
              <CardContent>
                <UsageMeter usedUsd={used} limitUsd={limit} scope={f} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "amber" | "red";
}) {
  const toneClass = tone === "red" ? "text-red-500" : tone === "amber" ? "text-amber-500" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function CapField({
  label,
  help,
  value,
  onChange,
  suffix,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          step={suffix === "USD" ? "0.01" : "1"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={suffix ? "pr-14 font-mono" : "font-mono"}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}

function EventRow({ ev }: { ev: UsageEventRow }) {
  const statusBadge = (() => {
    if (ev.status === "ok")
      return <Badge variant="success" className="font-mono text-[10px]">OK</Badge>;
    if (ev.status === "denied")
      return <Badge variant="warning" className="font-mono text-[10px]">DENIED</Badge>;
    return <Badge variant="destructive" className="font-mono text-[10px]">ERROR</Badge>;
  })();

  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        {statusBadge}
        <span className="capitalize">{ev.feature}</span>
        <span className="font-mono text-xs text-muted-foreground">{ev.model}</span>
        {ev.image_count > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {ev.image_count} img
          </Badge>
        )}
        {ev.error_code && (
          <span className="font-mono text-xs text-red-500">{ev.error_code}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">${Number(ev.est_cost_usd).toFixed(4)}</span>
        <span>{formatRelativeTime(ev.created_at)}</span>
      </div>
    </div>
  );
}

// QuotaRow type re-export for completeness
export type { QuotaRow };
// Feature type re-export so editor stays consistent
export type { Feature };
