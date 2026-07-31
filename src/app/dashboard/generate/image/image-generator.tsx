"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Wand2,
  Download,
  Heart,
  ImageIcon as ImageIconLucide,
  Upload,
  X,
  Save,
  Check,
  Library,
  Settings as SettingsIcon,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NoKeyBanner } from "@/components/dashboard/no-key-banner";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { saveImageAction, generateImageAction } from "./actions";

const STYLES = [
  { value: "photorealistic", label: "Photorealistic" },
  { value: "illustrated", label: "Illustrated" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
] as const;

type StyleValue = (typeof STYLES)[number]["value"];
type AspectValue = "1:1" | "4:5" | "16:9" | "9:16";

const ASPECT_OPTIONS: Array<{ value: AspectValue; label: string }> = [
  { value: "1:1", label: "Square" },
  { value: "4:5", label: "Portrait" },
  { value: "16:9", label: "Landscape" },
  { value: "9:16", label: "Story" },
];

type SavedState = "idle" | "saving" | "saved" | "error";

interface GeneratedImage {
  id: string;
  url: string;
  aspectRatio: AspectValue;
  width: number;
  height: number;
  prompt: string;
}

export function ImageGenerator({
  hasKey,
  monthCostUsd,
  monthlyBudgetUsd,
}: {
  hasKey: boolean;
  monthCostUsd: number;
  monthlyBudgetUsd: number;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [savedStates, setSavedStates] = useState<Record<string, SavedState>>({});
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [lastCostUsd, setLastCostUsd] = useState(0);

  const [form, setForm] = useState<{
    prompt: string;
    aspectRatio: AspectValue;
    style: StyleValue;
  }>({
    prompt: "",
    aspectRatio: "1:1",
    style: "photorealistic",
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onGenerate() {
    if (!form.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (!hasKey) {
      toast.error("Add your OpenAI key in Settings first.");
      return;
    }
    setLoading(true);
    setResults([]);
    setSavedStates({});
    setLastCostUsd(0);
    try {
      const res = await generateImageAction({
        prompt: form.prompt,
        aspectRatio: form.aspectRatio,
        style: form.style,
        count: 4,
      });

      if (!res.ok) {
        if (res.reason === "no_key") {
          toast.error("No OpenAI key configured. Add one in Settings → API keys.");
        } else if (res.cap) {
          toast.error(
            `You've hit your ${res.cap.scope} cap ($${res.cap.used.toFixed(2)} of $${res.cap.limit.toFixed(2)}). Raise it in Settings → Usage.`,
          );
        } else if (res.error) {
          toast.error(res.error);
        } else {
          toast.error("Failed to generate images");
        }
        return;
      }

      const aspectSet = new Set<string>(ASPECT_OPTIONS.map((a) => a.value));
      const typed: GeneratedImage[] = res.images.map((img) => ({
        ...img,
        aspectRatio: aspectSet.has(img.aspectRatio)
          ? (img.aspectRatio as AspectValue)
          : form.aspectRatio,
      }));
      setResults(typed);
      setLastCostUsd(res.costUsd);
      toast.success(`Generated ${res.images.length} creatives · ~$${res.costUsd.toFixed(4)}`);
    } catch {
      toast.error("Failed to generate images");
    } finally {
      setLoading(false);
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function downloadImage(img: GeneratedImage) {
    const link = document.createElement("a");
    link.href = img.url;
    link.download = `atlas-${img.id}.${img.url.startsWith("data:image/svg") ? "svg" : "png"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded");
  }

  async function saveImage(img: GeneratedImage) {
    setSavedStates((prev) => ({ ...prev, [img.id]: "saving" }));
    try {
      const res = await saveImageAction({
        name: `${form.prompt.slice(0, 60) || "Atlas creative"} (${img.aspectRatio})`,
        url: img.url,
        aspect_ratio: img.aspectRatio,
        width: img.width,
        height: img.height,
        prompt: img.prompt || form.prompt,
      });
      if (!res.ok) {
        setSavedStates((prev) => ({ ...prev, [img.id]: "error" }));
        toast.error(res.error || "Save failed");
        return;
      }
      setSavedStates((prev) => ({ ...prev, [img.id]: "saved" }));
      toast.success("Saved to library");
    } catch (err) {
      setSavedStates((prev) => ({ ...prev, [img.id]: "error" }));
      toast.error((err as Error).message || "Save failed");
    }
  }

  return (
    <div className="space-y-4">
      {!hasKey && <NoKeyBanner feature="image" />}

      <Card>
        <CardContent className="p-4">
          <UsageMeter usedUsd={monthCostUsd} limitUsd={monthlyBudgetUsd} scope="image" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Creative brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt *</Label>
              <Textarea
                id="prompt"
                placeholder="Describe what you want. e.g. 'Premium coffee beans in a kraft bag, studio shot, soft light, warm tones'"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={5}
              />
            </div>

            {/* Aspect ratio picker */}
            <div className="space-y-2">
              <Label>Aspect ratio</Label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setForm({ ...form, aspectRatio: a.value })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-2.5 transition-colors",
                      form.aspectRatio === a.value
                        ? "border-foreground/30 bg-secondary"
                        : "border-border hover:border-border/80",
                    )}
                    aria-pressed={form.aspectRatio === a.value}
                  >
                    <AspectPreview ratio={a.value} active={form.aspectRatio === a.value} />
                    <span className="text-[10px] font-medium">{a.label}</span>
                    <span className="text-[9px] text-muted-foreground">{a.value}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select
                value={form.style}
                onValueChange={(v) => setForm({ ...form, style: v as StyleValue })}
              >
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference image (optional)</Label>
              {uploadedImage ? (
                <div className="relative overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedImage}
                    alt="Reference"
                    className="h-32 w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => setUploadedImage(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card px-4 py-6 text-center transition-colors hover:bg-secondary/40">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Click to upload (PNG, JPG, max 10MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            <Separator />

            <Button onClick={onGenerate} disabled={loading || !hasKey} className="w-full" size="lg">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {loading ? "Generating…" : "Generate creatives"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4 lg:col-span-3">
          {!results.length && !loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary">
                  <ImageIconLucide className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-medium">
                  {hasKey ? "No creatives yet" : "Bring your own key to start"}
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {hasKey
                    ? "Describe your ad and Atlas will produce 4 variations in the chosen aspect ratio. Use a reference image to keep things on-brand."
                    : "Add your OpenAI key in Settings, then come back to generate ad creatives in seconds."}
                </p>
                {!hasKey && (
                  <Button asChild size="sm" className="mt-4">
                    <Link href="/dashboard/settings/api-keys">
                      <SettingsIcon className="h-3.5 w-3.5" />
                      Add API key
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          )}

          {results.length > 0 && !loading && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  {results.length} creatives · tap save on the ones you like
                  <Badge variant="outline" className="font-mono text-[10px]">
                    ~${lastCostUsd.toFixed(4)}
                  </Badge>
                </span>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/assets">
                    <Library className="h-3.5 w-3.5" />
                    View library
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {results.map((img) => {
                  const saveState: SavedState = savedStates[img.id] ?? "idle";
                  return (
                    <ResultCard
                      key={img.id}
                      image={img}
                      favorited={favorites.has(img.id)}
                      saveState={saveState}
                      onFavorite={() => toggleFavorite(img.id)}
                      onDownload={() => downloadImage(img)}
                      onSave={() => saveImage(img)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AspectPreview({ ratio, active }: { ratio: string; active: boolean }) {
  const dims: Record<string, string> = {
    "1:1": "h-7 w-7",
    "4:5": "h-8 w-6",
    "16:9": "h-5 w-9",
    "9:16": "h-9 w-5",
  };
  return (
    <div
      className={cn(
        "rounded-sm border",
        active ? "border-foreground bg-foreground" : "border-border bg-secondary",
        dims[ratio],
      )}
    />
  );
}

function ResultCard({
  image,
  favorited,
  saveState,
  onFavorite,
  onDownload,
  onSave,
}: {
  image: GeneratedImage;
  favorited: boolean;
  saveState: SavedState;
  onFavorite: () => void;
  onDownload: () => void;
  onSave: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-card">
      <div
        className={cn(
          "flex w-full items-center justify-center",
          image.aspectRatio === "1:1" && "aspect-square",
          image.aspectRatio === "4:5" && "aspect-[4/5]",
          image.aspectRatio === "16:9" && "aspect-video",
          image.aspectRatio === "9:16" && "aspect-[9/16]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.prompt}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <Badge variant="outline" className="border-white/20 bg-black/40 text-white">
          {image.aspectRatio}
        </Badge>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={onFavorite}
            aria-label="Favorite"
          >
            <Heart
              className={cn("h-3.5 w-3.5", favorited && "fill-red-500 text-red-500")}
            />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={onSave}
            aria-label="Save to library"
            disabled={saveState === "saving" || saveState === "saved"}
          >
            {saveState === "saving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveState === "saved" ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : saveState === "error" ? (
              <Save className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={onDownload}
            aria-label="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {saveState === "saved" && (
        <div className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          Saved
        </div>
      )}
    </div>
  );
}
