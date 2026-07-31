"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  upsertBrandKit,
  getActiveBrandKit,
  type BrandKitRow,
} from "@/lib/supabase/queries";

export async function fetchActiveBrandKitAction(): Promise<BrandKitRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getActiveBrandKit(user.id);
}

export async function saveBrandKitAction(payload: {
  id?: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
}): Promise<{ ok: true; kit: BrandKitRow } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    const kit = await upsertBrandKit(user.id, payload);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/brand-kit");
    return { ok: true, kit };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
