"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, Loader2, Trash2, ShieldCheck, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";
import type { ApiKeyRow, Provider } from "@/lib/supabase/queries";
import {
  addApiKeyAction,
  deleteApiKeyAction,
  fetchApiKeysAction,
  verifyApiKeyAction,
} from "./actions";

const PROVIDERS: Array<{ id: Provider; label: string; placeholder: string }> = [
  { id: "minimax", label: "MiniMax", placeholder: "eyJhbGciOi…" },
  { id: "openai", label: "OpenAI", placeholder: "sk-…" },
];

export function ApiKeysClient({
  initialKeys,
  serviceRoleReady,
}: {
  initialKeys: ApiKeyRow[];
  serviceRoleReady: boolean;
}) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function refresh() {
    const fresh = await fetchApiKeysAction();
    setKeys(fresh);
  }

  async function handleAdd(formData: FormData) {
    const provider = (formData.get("provider") as Provider) || "openai";
    const apiKey = (formData.get("apiKey") as string) ?? "";
    const label = (formData.get("label") as string) || undefined;
    if (!apiKey.trim()) {
      toast.error("Paste your key first.");
      return;
    }
    startTransition(async () => {
      const res = await addApiKeyAction({ provider, apiKey, label });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Key saved");
      setAddOpen(false);
      await refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this key? Atlas will stop being able to generate for you.")) return;
    startTransition(async () => {
      const res = await deleteApiKeyAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Key deleted");
      await refresh();
    });
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    try {
      const res = await verifyApiKeyAction(id);
      if (res.ok) {
        toast.success("Key verified — provider accepted it.");
      } else {
        toast.error(`Verification failed: ${res.reason}`);
      }
      await refresh();
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {!serviceRoleReady && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Server-side key not configured</p>
              <p className="text-muted-foreground">
                Set <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> in your server
                environment so Atlas can write keys to Supabase Vault. Without it, adding a key
                will fail.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {keys.length === 0
            ? "No keys configured yet."
            : `${keys.length} provider${keys.length === 1 ? "" : "s"} configured.`}
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add key
            </Button>
          </DialogTrigger>
          <AddKeyDialog onSubmit={handleAdd} disabled={!serviceRoleReady} />
        </Dialog>
      </div>

      {keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">Add your first API key</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Pick a provider (MiniMax or OpenAI), paste the key, and Atlas will start using it
              for your generations. You can add both and switch per-feature.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <ApiKeyRowCard
              key={k.id}
              row={k}
              verifying={verifyingId === k.id}
              onVerify={() => handleVerify(k.id)}
              onDelete={() => handleDelete(k.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApiKeyRowCard({
  row,
  verifying,
  onVerify,
  onDelete,
}: {
  row: ApiKeyRow;
  verifying: boolean;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const verifyBadge = (() => {
    if (row.verify_status === "ok")
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
        </Badge>
      );
    if (row.verify_status === "invalid")
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" /> Invalid
        </Badge>
      );
    return <Badge variant="outline">Unverified</Badge>;
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {row.label || providerLabel(row.provider)}
              <span className="font-mono text-xs text-muted-foreground">···{row.key_last4 ?? "????"}</span>
            </CardTitle>
            <CardDescription>
              Created {formatRelativeTime(row.created_at)}
              {row.last_used_at && (
                <> · last used {formatRelativeTime(row.last_used_at)}</>
              )}
              {row.last_verified_at && (
                <> · verified {formatRelativeTime(row.last_verified_at)}</>
              )}
            </CardDescription>
            {row.verify_message && row.verify_status === "invalid" && (
              <p className="text-xs text-red-500">{row.verify_message}</p>
            )}
          </div>
          {verifyBadge}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onVerify} disabled={verifying}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Verify
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic";
    case "google":
      return "Google";
    case "minimax":
      return "MiniMax";
    default:
      return provider;
  }
}

function AddKeyDialog({
  onSubmit,
  disabled,
}: {
  onSubmit: (formData: FormData) => void;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  const [provider, setProvider] = useState<Provider>("minimax");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add an API key</DialogTitle>
        <DialogDescription>
          Atlas encrypts the key with Supabase Vault and only stores a{" "}
          <span className="font-mono">…xxxx</span> handle afterwards.
        </DialogDescription>
      </DialogHeader>
      <form
        action={(fd) => onSubmit(fd)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={disabled}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label (optional)</Label>
          <Input id="label" name="label" placeholder="e.g. Personal MiniMax" disabled={disabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              name="apiKey"
              type={show ? "text" : "password"}
              placeholder={PROVIDERS.find((p) => p.id === provider)?.placeholder ?? "sk-…"}
              autoComplete="off"
              spellCheck={false}
              required
              disabled={disabled}
              className="pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide key" : "Show key"}
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={disabled}>
            Save key
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Suppress unused import warnings (Skeleton reserved for future async skeleton)
void Skeleton;
