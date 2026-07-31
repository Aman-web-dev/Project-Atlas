"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { executeImages } from "@/lib/ai/execute";
import { saveGeneratedImage } from "@/lib/supabase/queries";

export interface GenerateImageActionInput {
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "16:9" | "9:16";
  style?: string;
  count?: number;
}

export interface GenerateImageActionResult {
  ok: boolean;
  images: Array<{
    id: string;
    url: string;
    aspectRatio: string;
    width: number;
    height: number;
    prompt: string;
  }>;
  costUsd: number;
  reason?: "no_key";
  cap?: { reason: string; used: number; limit: number; scope: string };
  error?: string;
}

export async function generateImageAction(
  input: GenerateImageActionInput,
): Promise<GenerateImageActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, images: [], costUsd: 0, error: "Not signed in." };
  }

  return executeImages({
    userId: user.id,
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
    style: input.style,
    count: input.count ?? 4,
  });
}

// ============================================================================
// Save-to-library for generated images (unchanged behaviour, real insert).
// ============================================================================
export async function saveImageAction(payload: {
  name: string;
  url: string;
  aspect_ratio: string;
  width: number;
  height: number;
  prompt: string;
}): Promise<
  | { ok: true; id: string; url: string; name: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    const row = await saveGeneratedImage(user.id, payload);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/assets");
    return { ok: true, id: row.id, url: row.url, name: row.name };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
