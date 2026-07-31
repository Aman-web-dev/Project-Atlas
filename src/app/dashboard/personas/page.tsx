import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listPersonas } from "@/lib/supabase/queries";
import { PersonasClient } from "./personas-client";

export const metadata = { title: "Personas · Atlas" };

export default async function PersonasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialPersonas: Awaited<ReturnType<typeof listPersonas>> = [];
  if (user) {
    try {
      initialPersonas = await listPersonas(user.id);
    } catch (err) {
      console.error("Failed to load personas", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          Settings · Personas
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Customer personas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build Ideal Customer Profiles (Desires, Problems, Voice of Customer) so every piece
          of copy is written for someone specific.
        </p>
      </div>
      <PersonasClient initialPersonas={initialPersonas} />
    </div>
  );
}
