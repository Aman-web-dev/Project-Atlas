import { Layers } from "lucide-react";
import { BrandKitEditor } from "./brand-kit-editor";
import { createClient } from "@/lib/supabase/server";
import { getActiveBrandKit } from "@/lib/supabase/queries";

export const metadata = { title: "Brand Kit · Atlas" };

export default async function BrandKitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialKit: Awaited<ReturnType<typeof getActiveBrandKit>> = null;
  if (user) {
    try {
      initialKit = await getActiveBrandKit(user.id);
    } catch (err) {
      console.error("Failed to load brand kit", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-4 w-4" />
          Brand
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Brand kit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Store your logos, fonts, and colors once. Atlas keeps every generated creative
          on-brand.
        </p>
      </div>
      <BrandKitEditor initialKit={initialKit} />
    </div>
  );
}
