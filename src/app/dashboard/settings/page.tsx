import Link from "next/link";
import { KeyRound, BarChart3, Settings as SettingsIcon, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings · Atlas" };

export default function SettingsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SettingsIcon className="h-4 w-4" />
          Settings
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how Atlas spends on your behalf — your API keys, your caps, your usage.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/dashboard/settings/api-keys" className="group">
          <Card className="h-full transition-colors group-hover:border-border/80">
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
                <KeyRound className="h-4 w-4" />
              </div>
              <CardTitle className="mt-4">API keys</CardTitle>
              <CardDescription>
                Bring your own OpenAI key. Atlas encrypts it with Supabase Vault and only
                uses it for your calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-muted-foreground group-hover:text-foreground">
                Manage keys <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings/usage" className="group">
          <Card className="h-full transition-colors group-hover:border-border/80">
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary">
                <BarChart3 className="h-4 w-4" />
              </div>
              <CardTitle className="mt-4">Usage & caps</CardTitle>
              <CardDescription>
                Track every call against your monthly budget. Set a hard ceiling so a runaway
                prompt can't burn the whole wallet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex items-center text-sm text-muted-foreground group-hover:text-foreground">
                View usage <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How BYOK works in Atlas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <Badge variant="outline" className="mr-2">1</Badge>
            You paste your OpenAI API key. Atlas stores the plaintext in Supabase Vault
            (hardware-encrypted) and only keeps a{" "}
            <span className="font-mono text-foreground">…xxxx</span> handle in the row that
            the rest of the app can see.
          </p>
          <p>
            <Badge variant="outline" className="mr-2">2</Badge>
            Every generation call runs on the server. Atlas pulls your key from Vault, checks
            your monthly cap, calls OpenAI, then logs the request with estimated cost to{" "}
            <span className="font-mono text-foreground">usage_events</span>.
          </p>
          <p>
            <Badge variant="outline" className="mr-2">3</Badge>
            You set a hard ceiling (USD) per month and per feature. Calls that would push you
            over are denied before they leave the server — no surprise bills.
          </p>
          <p>
            <Badge variant="outline" className="mr-2">4</Badge>
            You can revoke the key at any time from this page. Deleting also purges the secret
            from Vault.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
