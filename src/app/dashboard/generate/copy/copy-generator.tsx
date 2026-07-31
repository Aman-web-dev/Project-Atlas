"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Copy,
  Check,
  Loader2,
  Wand2,
  Save,
  Settings as SettingsIcon,
  Users,
  Star,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { NoKeyBanner } from "@/components/dashboard/no-key-banner";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { saveCopyAction, generateCopyAction } from "./actions";
import type { PersonaRow } from "@/lib/supabase/queries";

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "google", label: "Google Ads" },
  { value: "x", label: "X / Twitter" },
  { value: "pinterest", label: "Pinterest" },
] as const;

type PlatformValue = (typeof PLATFORMS)[number]["value"];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "playful", label: "Playful" },
  { value: "inspiring", label: "Inspiring" },
  { value: "urgent", label: "Urgent" },
] as const;

type ToneValue = (typeof TONES)[number]["value"];

interface Brief {
  productName: string;
  productDescription: string;
  targetAudience: string;
  budget: string;
  platform: PlatformValue;
  tone: ToneValue;
}

interface Result {
  headlines: string[];
  descriptions: string[];
  ctas: string[];
  costUsd: number;
  provider?: string;
  personaId?: string | null;
}

export function CopyGenerator({
  hasKey,
  monthCostUsd,
  monthlyBudgetUsd,
  personas,
  defaultPersonaId,
}: {
  hasKey: boolean;
  monthCostUsd: number;
  monthlyBudgetUsd: number;
  personas: PersonaRow[];
  defaultPersonaId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(defaultPersonaId);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedPersona = personas.find((p) => p.id === personaId) ?? null;

  const [form, setForm] = useState<Brief>({
    productName: "",
    productDescription: "",
    targetAudience: "",
    budget: "",
    platform: "instagram",
    tone: "professional",
  });

  async function onGenerate() {
    if (!form.productName.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    if (!hasKey) {
      toast.error("Add your OpenAI or MiniMax key in Settings first.");
      return;
    }
    setLoading(true);
    setResult(null);
    setSaved(false);
    setBrief(null);
    try {
      const data = await generateCopyAction({
        productName: form.productName,
        productDescription: form.productDescription || undefined,
        targetAudience: form.targetAudience || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        platform: form.platform,
        tone: form.tone,
        personaId,
      });

      if (!data.ok) {
        if (data.reason === "no_key") {
          toast.error("No API key configured. Add one in Settings → API keys.");
        } else if (data.cap) {
          toast.error(
            `You've hit your ${data.cap.scope} cap ($${data.cap.used.toFixed(2)} of $${data.cap.limit.toFixed(2)}). Raise it in Settings → Usage.`,
          );
        } else if (data.error) {
          toast.error(data.error);
        } else {
          toast.error("Failed to generate copy");
        }
        return;
      }

      setResult({
        headlines: data.headlines,
        descriptions: data.descriptions,
        ctas: data.ctas,
        costUsd: data.costUsd,
        provider: data.provider,
        personaId,
      });
      setBrief({ ...form });
      const personaLabel = selectedPersona ? ` for ${selectedPersona.name}` : "";
      toast.success(
        `Generated copy${personaLabel} · ~$${data.costUsd.toFixed(4)}${
          data.provider ? ` via ${data.provider}` : ""
        }`,
      );
    } catch {
      toast.error("Failed to generate copy");
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (!result || !brief) return;
    setSaving(true);
    try {
      const res = await saveCopyAction({
        product_name: brief.productName,
        product_description: brief.productDescription || undefined,
        target_audience: brief.targetAudience || undefined,
        budget: brief.budget ? Number(brief.budget) : undefined,
        platform: brief.platform,
        headlines: result.headlines,
        descriptions: result.descriptions,
        ctas: result.ctas,
      });
      if (!res.ok) {
        toast.error(res.error || "Save failed");
        return;
      }
      setSaved(true);
      toast.success("Saved to your library");
    } catch (err) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="space-y-4">
      {!hasKey && <NoKeyBanner feature="copy" />}

      <Card>
        <CardContent className="p-4">
          <UsageMeter usedUsd={monthCostUsd} limitUsd={monthlyBudgetUsd} scope="copy" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaign brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Persona selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="persona" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Persona (ICP)
                </Label>
                <Link
                  href="/dashboard/personas"
                  className="text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {personas.length === 0 ? "+ create one" : "manage"}
                </Link>
              </div>
              {personas.length === 0 ? (
                <Link
                  href="/dashboard/personas"
                  className="flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-secondary/50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Build an ICP in Settings → Personas so Atlas can write for someone specific.
                </Link>
              ) : (
                <Select
                  value={personaId ?? "__none__"}
                  onValueChange={(v) => setPersonaId(v === "__none__" ? null : v)}
                >
                  <SelectTrigger id="persona" className="h-9">
                    <SelectValue placeholder="Pick a persona…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">None — generic copy</span>
                    </SelectItem>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-1.5">
                          {p.is_default && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                          {p.name}
                          {p.is_default && (
                            <span className="text-[10px] text-muted-foreground">· default</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedPersona && (
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{selectedPersona.name}</span>
                  {selectedPersona.desires && <> · desires: {truncate(selectedPersona.desires, 60)}</>}
                  {selectedPersona.problems && <> · pain: {truncate(selectedPersona.problems, 60)}</>}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Product name *</Label>
              <Input
                id="productName"
                placeholder="e.g. Premium Coffee Beans"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">Product description</Label>
              <Textarea
                id="productDescription"
                placeholder="What makes it special? Who is it for?"
                value={form.productDescription}
                onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target audience</Label>
              <Input
                id="targetAudience"
                placeholder="e.g. Coffee enthusiasts, ages 25-45"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="500"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={form.platform}
                  onValueChange={(value) =>
                    setForm({ ...form, platform: value as PlatformValue })
                  }
                >
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={form.tone}
                onValueChange={(v) => setForm({ ...form, tone: v as ToneValue })}
              >
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Button onClick={onGenerate} disabled={loading || !hasKey} className="w-full" size="lg">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {loading ? "Generating…" : "Generate copy"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {!result && !loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary">
                  <Wand2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-medium">
                  {hasKey ? "No copy generated yet" : "Bring your own key to start"}
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {hasKey
                    ? selectedPersona
                      ? `Atlas will write copy tailored to ${selectedPersona.name} — leading with their pain, using their voice, and framing your product as the bridge to their desire.`
                      : "Fill in your campaign brief on the left and click Generate copy. For sharper copy, build a Persona in Settings."
                    : "Add your OpenAI or MiniMax key in Settings, then come back to generate on-brand copy in seconds."}
                </p>
                {!hasKey && (
                  <Button asChild size="sm" className="mt-4">
                    <Link href="/dashboard/settings/api-keys">
                      <SettingsIcon className="h-3.5 w-3.5" />
                      Add API key
                    </Link>
                  </Button>
                )}
                {hasKey && personas.length === 0 && (
                  <Button asChild size="sm" className="mt-4" variant="outline">
                    <Link href="/dashboard/personas">
                      <Plus className="h-3.5 w-3.5" />
                      Build your first persona
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {result && !loading && (
            <>
              <ResultSection
                title="Headlines"
                description="Catchy, scroll-stopping headlines. Pick one."
                items={result.headlines}
                iconType="h"
                copiedKey={copiedKey}
                onCopy={copyToClipboard}
              />
              <ResultSection
                title="Descriptions"
                description="Long-form copy for your primary text block."
                items={result.descriptions}
                iconType="d"
                copiedKey={copiedKey}
                onCopy={copyToClipboard}
              />
              <ResultSection
                title="Calls to action"
                description="Buttons and short prompts."
                items={result.ctas}
                iconType="c"
                copiedKey={copiedKey}
                onCopy={copyToClipboard}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {saved ? (
                    <span className="flex items-center gap-1.5 text-emerald-500">
                      <Check className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  ) : (
                    <span>Save to keep this copy for later.</span>
                  )}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    ~${result.costUsd.toFixed(4)}
                  </Badge>
                  {result.provider && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      via {result.provider}
                    </Badge>
                  )}
                  {selectedPersona && (
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="mr-1 h-3 w-3" /> {selectedPersona.name}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}>
                    <Wand2 className="h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button size="sm" onClick={onSave} disabled={saving || saved}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? "Saving…" : saved ? "Saved" : "Save to library"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function ResultSection({
  title,
  description,
  items,
  iconType,
  copiedKey,
  onCopy,
}: {
  title: string;
  description: string;
  items: string[];
  iconType: "h" | "d" | "c";
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <Badge variant="outline">{items.length} variations</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((text, i) => {
          const key = `${iconType}-${i}`;
          const isCopied = copiedKey === key;
          return (
            <div
              key={key}
              className="group flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-3 text-sm transition-colors hover:border-border"
            >
              <span className="flex-1">{text}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCopy(text, key)}
                aria-label={`Copy ${title} ${i + 1}`}
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Skeleton import reserved for future async skeleton states.
void Skeleton;
