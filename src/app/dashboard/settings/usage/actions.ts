"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getUserQuotas,
  updateUserQuotas,
  getMonthlyUsage,
  getDailyUsage,
  getRecentUsageEvents,
  type QuotaRow,
  type UsageEventRow,
} from "@/lib/supabase/queries";

export interface UsageSnapshot {
  quota: QuotaRow;
  month: {
    requests: number;
    est_cost_usd: number;
    images: number;
  };
  byFeature: {
    feature: "copy" | "image";
    requests: number;
    est_cost_usd: number;
    images: number;
  }[];
  daily: Array<{ day: string; est_cost_usd: number; requests: number }>;
  recent: UsageEventRow[];
  monthStartIso: string;
}

function monthStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchUsageAction(): Promise<UsageSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const monthStart = monthStartIso();
  const [quota, month, daily, recent] = await Promise.all([
    getUserQuotas(user.id),
    getMonthlyUsage(user.id, monthStart),
    getDailyUsage(user.id, 29),
    getRecentUsageEvents(user.id, 50),
  ]);
  return { quota, month: month.total, byFeature: month.byFeature, daily, recent, monthStartIso: monthStart };
}

export async function updateQuotasAction(
  patch: Partial<
    Pick<
      QuotaRow,
      | "monthly_budget_usd"
      | "copy_budget_usd"
      | "image_budget_usd"
      | "monthly_request_cap"
      | "enforce_caps"
    >
  >,
): Promise<{ ok: true; quota: QuotaRow } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Sanitize numeric fields — empty strings become null-ish defaults.
  const cleaned: typeof patch = { ...patch };
  if (cleaned.monthly_budget_usd !== undefined) {
    const v = Number(cleaned.monthly_budget_usd);
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: "Monthly budget must be ≥ 0." };
    cleaned.monthly_budget_usd = v;
  }
  if (cleaned.copy_budget_usd !== undefined) {
    const v = Number(cleaned.copy_budget_usd);
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: "Copy budget must be ≥ 0." };
    cleaned.copy_budget_usd = v;
  }
  if (cleaned.image_budget_usd !== undefined) {
    const v = Number(cleaned.image_budget_usd);
    if (!Number.isFinite(v) || v < 0) return { ok: false, error: "Image budget must be ≥ 0." };
    cleaned.image_budget_usd = v;
  }
  if (cleaned.monthly_request_cap !== undefined) {
    const v = Number(cleaned.monthly_request_cap);
    if (!Number.isFinite(v) || v < 1) return { ok: false, error: "Request cap must be ≥ 1." };
    cleaned.monthly_request_cap = Math.floor(v);
  }

  try {
    const quota = await updateUserQuotas(user.id, cleaned);
    revalidatePath("/dashboard/settings/usage");
    revalidatePath("/dashboard/generate/copy");
    revalidatePath("/dashboard/generate/image");
    return { ok: true, quota };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
