import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getUserQuotas,
  getMonthlyUsage,
  getDailyUsage,
  getRecentUsageEvents,
  listApiKeys,
} from "@/lib/supabase/queries";
import { UsageClient } from "./usage-client";

export const metadata = { title: "Usage · Atlas" };

function monthStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="text-sm text-muted-foreground">Not signed in.</p>
      </div>
    );
  }

  const monthStart = monthStartIso();
  const [quota, month, daily, recent, keys] = await Promise.all([
    getUserQuotas(user.id),
    getMonthlyUsage(user.id, monthStart),
    getDailyUsage(user.id, 29),
    getRecentUsageEvents(user.id, 50),
    listApiKeys(user.id).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Settings · Usage & caps
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Usage & caps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track every call against your monthly budget and tune the hard ceiling Atlas
          enforces before each request.
        </p>
      </div>
      <UsageClient
        initial={{
          quota,
          month: month.total,
          byFeature: month.byFeature,
          daily,
          recent,
          hasKey: keys.length > 0,
          monthStartIso: monthStart,
        }}
      />
    </div>
  );
}
