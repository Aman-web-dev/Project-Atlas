import { ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listApiKeys, getMonthlyUsage } from "@/lib/supabase/queries";
import { ImageGenerator } from "./image-generator";

export const metadata = { title: "AI Image · Atlas" };

function monthStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function ImagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasKey = false;
  let monthCost = 0;
  let monthlyBudget = 0;
  if (user) {
    try {
      const [keys, month] = await Promise.all([
        listApiKeys(user.id),
        getMonthlyUsage(user.id, monthStartIso()),
      ]);
      hasKey = keys.some((k) => k.provider === "openai");
      monthCost = month.total.est_cost_usd;
      monthlyBudget = 25;
    } catch (err) {
      console.error("Failed to load BYOK state", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          AI · Image
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI image generation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atlas turns prompts into on-brand ad creatives in any aspect ratio using your
          OpenAI key.
        </p>
      </div>
      <ImageGenerator
        hasKey={hasKey}
        monthCostUsd={monthCost}
        monthlyBudgetUsd={monthlyBudget}
      />
    </div>
  );
}
