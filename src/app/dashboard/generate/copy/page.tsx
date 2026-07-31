import { PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listApiKeys, getMonthlyUsage, listPersonas } from "@/lib/supabase/queries";
import { CopyGenerator } from "./copy-generator";

export const metadata = { title: "AI Copy · Atlas" };

function monthStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function CopyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasKey = false;
  let monthCost = 0;
  let monthlyBudget = 25;
  let personas: Awaited<ReturnType<typeof listPersonas>> = [];
  if (user) {
    try {
      const [keys, month, ppls] = await Promise.all([
        listApiKeys(user.id),
        getMonthlyUsage(user.id, monthStartIso()),
        listPersonas(user.id),
      ]);
      hasKey = keys.some((k) => k.provider === "openai" || k.provider === "minimax");
      monthCost = month.total.est_cost_usd;
      personas = ppls;
    } catch (err) {
      console.error("Failed to load BYOK state", err);
    }
  }

  const defaultPersona = personas.find((p) => p.is_default) ?? personas[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PenLine className="h-4 w-4" />
          AI · Copy
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI copy generation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atlas generates on-brand headlines, descriptions, and CTAs using your OpenAI or
          MiniMax key — tailored to the persona you pick below.
        </p>
      </div>
      <CopyGenerator
        hasKey={hasKey}
        monthCostUsd={monthCost}
        monthlyBudgetUsd={monthlyBudget}
        personas={personas}
        defaultPersonaId={defaultPersona?.id ?? null}
      />
    </div>
  );
}
