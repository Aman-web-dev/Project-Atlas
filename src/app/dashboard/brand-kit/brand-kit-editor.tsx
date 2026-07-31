"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { BrandKitRow } from "@/lib/supabase/queries";
import { fetchActiveBrandKitAction, saveBrandKitAction } from "./actions";

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Playfair Display",
  "Lora",
  "Poppins",
  "Bebas Neue",
];

const PRESET_COLORS = [
  "#0F172A",
  "#FFFFFF",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

interface BrandKit {
  id: string | null;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  /** Either an http(s) URL from Supabase Storage or a data: URL for new uploads. */
  logoUrl: string | null;
}

const EMPTY_KIT: BrandKit = {
  id: null,
  name: "My brand",
  primaryColor: "#0F172A",
  secondaryColor: "#3B82F6",
  accentColor: "#10B981",
  fontHeading: "Inter",
  fontBody: "Inter",
  logoUrl: null,
};

function kitFromRow(row: BrandKitRow | null): BrandKit {
  if (!row) return EMPTY_KIT;
  return {
    id: row.id,
    name: row.name,
    primaryColor: row.primary_color ?? "#0F172A",
    secondaryColor: row.secondary_color ?? "#3B82F6",
    accentColor: row.accent_color ?? "#10B981",
    fontHeading: row.font_heading ?? "Inter",
    fontBody: row.font_body ?? "Inter",
    logoUrl: row.logo_url ?? null,
  };
}

export function BrandKitEditor({ initialKit }: { initialKit: BrandKitRow | null }) {
  const [kit, setKit] = useState<BrandKit>(kitFromRow(initialKit));
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  // If the server hands us a fresh kit after revalidation, sync the editor.
  useEffect(() => {
    setKit(kitFromRow(initialKit));
    setSaved(true);
  }, [initialKit]);

  function update<K extends keyof BrandKit>(key: K, value: BrandKit[K]) {
    setKit((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    try {
      const res = await saveBrandKitAction({
        id: kit.id ?? undefined,
        name: kit.name,
        primary_color: kit.primaryColor,
        secondary_color: kit.secondaryColor,
        accent_color: kit.accentColor,
        font_heading: kit.fontHeading,
        font_body: kit.fontBody,
        logo_url: kit.logoUrl,
      });
      if (!res.ok) {
        toast.error(res.error || "Save failed");
        return;
      }
      // Reflect any server-generated id back into the local state.
      setKit((prev) => ({ ...prev, id: res.kit.id }));
      // Refresh from server so we have the canonical row (URLs etc.).
      const fresh = await fetchActiveBrandKitAction();
      if (fresh) setKit(kitFromRow(fresh));
      setSaved(true);
      toast.success("Brand kit saved");
    } catch (err) {
      toast.error((err as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // Until logo upload hits Supabase Storage, we preview locally so the user
    // sees their file right away. The data URL is persisted on Save.
    const reader = new FileReader();
    reader.onload = () => {
      update("logoUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setKit(kitFromRow(initialKit));
    setSaved(true);
  }

  const isEmpty = !initialKit && !kit.logoUrl && kit.name === EMPTY_KIT.name;

  return (
    <Tabs defaultValue="identity" className="space-y-6">
      <TabsList>
        <TabsTrigger value="identity">Identity</TabsTrigger>
        <TabsTrigger value="fonts">Typography</TabsTrigger>
        <TabsTrigger value="logos">Logos</TabsTrigger>
      </TabsList>

      <TabsContent value="identity" className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Colors</CardTitle>
              <CardDescription>
                Pick the colors Atlas will use across every generated creative.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Brand name</Label>
                <Input
                  value={kit.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Atlas Coffee"
                />
              </div>

              {(
                [
                  { key: "primaryColor", label: "Primary" },
                  { key: "secondaryColor", label: "Secondary" },
                  { key: "accentColor", label: "Accent" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={kit[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent"
                    />
                    <Input
                      value={kit[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update(key, c)}
                        className={cn(
                          "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                          kit[key] === c ? "border-foreground" : "border-border",
                        )}
                        style={{ background: c }}
                        aria-label={`Use ${c}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your brand looks at a glance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-md border border-border p-5"
                style={{
                  background: kit.primaryColor,
                  color: "#ffffff",
                }}
              >
                <p className="text-xs uppercase tracking-widest opacity-70">Brand</p>
                <p className="mt-2 text-2xl font-semibold">{kit.name}</p>
                <div className="mt-4 flex gap-2">
                  <div
                    className="h-8 flex-1 rounded-md"
                    style={{ background: kit.secondaryColor }}
                  />
                  <div
                    className="h-8 flex-1 rounded-md"
                    style={{ background: kit.accentColor }}
                  />
                </div>
                <p className="mt-4 text-xs opacity-70">
                  {kit.fontHeading} · {kit.fontBody}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="fonts">
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Pick fonts used in your creatives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Heading font</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => update("fontHeading", font)}
                    className={cn(
                      "rounded-md border border-border p-3 text-left transition-colors",
                      kit.fontHeading === font &&
                        "border-foreground/40 bg-secondary",
                    )}
                  >
                    <p className="text-lg" style={{ fontFamily: font }}>
                      {font}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Aa Bb Cc 123</p>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Body font</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => update("fontBody", font)}
                    className={cn(
                      "rounded-md border border-border p-3 text-left transition-colors",
                      kit.fontBody === font && "border-foreground/40 bg-secondary",
                    )}
                  >
                    <p style={{ fontFamily: font }}>
                      The quick brown fox jumps over the lazy dog.
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logos">
        <Card>
          <CardHeader>
            <CardTitle>Logos</CardTitle>
            <CardDescription>
              Upload your logos. Atlas will place them automatically into generated
              creatives.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kit.logoUrl ? (
              <div className="space-y-3">
                <div className="relative flex items-center justify-center rounded-md border border-border bg-secondary/40 p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={kit.logoUrl}
                    alt="Brand logo"
                    className="max-h-32 max-w-full object-contain"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-3 h-7 w-7"
                    onClick={() => update("logoUrl", null)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Replace logo
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card px-4 py-12 text-center transition-colors hover:bg-secondary/40">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm">Drop your logo here, or click to browse</p>
                <p className="text-xs text-muted-foreground">PNG, SVG, max 5MB</p>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoUpload}
                />
              </label>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-6 -mb-8 mt-8 border-t border-border bg-background/95 px-6 py-3 backdrop-blur md:-mx-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {saved ? (
              <Badge variant="success">
                <Check className="mr-1 h-3 w-3" />
                {isEmpty ? "No brand kit yet — fill in details and save" : "Saved"}
              </Badge>
            ) : (
              <Badge variant="warning">Unsaved changes</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} disabled={saving}>
              Reset
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Tabs>
  );
}
