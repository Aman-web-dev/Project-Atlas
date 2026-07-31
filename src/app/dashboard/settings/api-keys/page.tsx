import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listApiKeys } from "@/lib/supabase/queries";
import { hasServiceRole } from "@/lib/supabase/service";
import { ApiKeysClient } from "./api-keys-client";

export const metadata = { title: "API Keys · Atlas" };

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialKeys: Awaited<ReturnType<typeof listApiKeys>> = [];
  if (user) {
    try {
      initialKeys = await listApiKeys(user.id);
    } catch (err) {
      console.error("Failed to load API keys", err);
    }
  }

  const serviceRoleReady = hasServiceRole();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          Settings · API keys
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring your own OpenAI key. Atlas stores it encrypted in Supabase Vault and uses
          it server-side only — your key is never sent to the browser.
        </p>
      </div>
      <ApiKeysClient initialKeys={initialKeys} serviceRoleReady={serviceRoleReady} />
    </div>
  );
}
