import { Library } from "lucide-react";
import { AssetLibrary } from "./asset-library";
import { createClient } from "@/lib/supabase/server";
import { listAssets } from "@/lib/supabase/queries";

export const metadata = { title: "Asset Library · Atlas" };

export default async function AssetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialAssets: Awaited<ReturnType<typeof listAssets>> = [];
  if (user) {
    try {
      initialAssets = await listAssets(user.id);
    } catch (err) {
      console.error("Failed to load assets", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Library className="h-4 w-4" />
          Library
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Asset library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every image, video, generated creative, and template — searchable and ready
          to drop into any campaign.
        </p>
      </div>
      <AssetLibrary initialAssets={initialAssets} />
    </div>
  );
}
