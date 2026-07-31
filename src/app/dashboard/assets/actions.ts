"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadAsset as uploadAssetQuery,
  deleteAsset as deleteAssetQuery,
  listAssets,
  type AssetRow,
} from "@/lib/supabase/queries";

export async function fetchAssetsAction(): Promise<AssetRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listAssets(user.id);
}

export async function uploadAssetAction(
  formData: FormData,
): Promise<{ ok: true; asset: AssetRow } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("file");
  const kindRaw = formData.get("kind");
  const kind =
    kindRaw === "image" ||
    kindRaw === "video" ||
    kindRaw === "logo" ||
    kindRaw === "template"
      ? kindRaw
      : "image";

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  try {
    const asset = await uploadAssetQuery(user.id, file, kind);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/assets");
    return { ok: true, asset };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteAssetAction(
  assetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    await deleteAssetQuery(user.id, assetId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/assets");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
