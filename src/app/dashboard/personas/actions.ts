"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPersona,
  deletePersona,
  listPersonas,
  setDefaultPersona,
  updatePersona,
  type PersonaRow,
} from "@/lib/supabase/queries";

// Read
export async function fetchPersonasAction(): Promise<PersonaRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return listPersonas(user.id);
}

// Create
export async function createPersonaAction(payload: {
  name: string;
  demographics?: string;
  desires?: string;
  problems?: string;
  voice_of_customer?: string;
  notes?: string;
  is_default?: boolean;
}): Promise<{ ok: true; row: PersonaRow } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!payload.name.trim()) return { ok: false, error: "Persona name is required." };

  try {
    const row = await createPersona(user.id, payload);
    revalidatePath("/dashboard/personas");
    revalidatePath("/dashboard/generate/copy");
    return { ok: true, row };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Update
export async function updatePersonaAction(
  id: string,
  patch: Partial<
    Pick<
      PersonaRow,
      | "name"
      | "demographics"
      | "desires"
      | "problems"
      | "voice_of_customer"
      | "notes"
      | "is_default"
    >
  >,
): Promise<{ ok: true; row: PersonaRow } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    const row = await updatePersona(user.id, id, patch);
    revalidatePath("/dashboard/personas");
    revalidatePath("/dashboard/generate/copy");
    return { ok: true, row };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Set as default
export async function setDefaultPersonaAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    await setDefaultPersona(user.id, id);
    revalidatePath("/dashboard/personas");
    revalidatePath("/dashboard/generate/copy");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Delete
export async function deletePersonaAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  try {
    await deletePersona(user.id, id);
    revalidatePath("/dashboard/personas");
    revalidatePath("/dashboard/generate/copy");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
