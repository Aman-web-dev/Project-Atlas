import Link from "next/link";
import { KeyRound, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function NoKeyBanner({ feature }: { feature: "copy" | "image" }) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10">
            <KeyRound className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Add your OpenAI key to start generating</p>
            <p className="text-xs text-muted-foreground">
              Atlas calls OpenAI with <b>your</b> key. The key is encrypted with Supabase Vault
              and never returned to the browser. You set your own spending cap.
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/dashboard/settings/api-keys">
            Add API key
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
