"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Search,
  Upload,
  ImageIcon,
  Video,
  FileText,
  Sparkles,
  Download,
  Trash2,
  Grid3x3,
  List,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AssetRow } from "@/lib/supabase/queries";
import {
  fetchAssetsAction,
  uploadAssetAction,
  deleteAssetAction,
} from "./actions";

type AssetType = "all" | "image" | "video" | "logo" | "template" | "generated";

const TYPE_META: Record<
  Exclude<AssetType, "all">,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  image: { label: "Image", icon: ImageIcon, color: "text-blue-500" },
  video: { label: "Video", icon: Video, color: "text-purple-500" },
  logo: { label: "Logo", icon: Sparkles, color: "text-amber-500" },
  template: { label: "Template", icon: FileText, color: "text-emerald-500" },
  generated: { label: "Generated", icon: Sparkles, color: "text-pink-500" },
};

function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function inferKindFromMime(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

export function AssetLibrary({ initialAssets }: { initialAssets: AssetRow[] }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<AssetType>("all");
  const [uploading, setUploading] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>(initialAssets);
  const [loaded, setLoaded] = useState(true);
  const [, startTransition] = useTransition();
  const fetchedOnce = useRef(true);

  // Refresh from the server on mount in case storage state changed in another tab.
  useEffect(() => {
    if (!fetchedOnce.current) return;
    fetchedOnce.current = false;
    startTransition(async () => {
      const fresh = await fetchAssetsAction();
      setAssets(fresh);
      setLoaded(true);
    });
  }, []);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (type !== "all" && a.type !== type) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [assets, search, type]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", inferKindFromMime(file.type));

      const res = await uploadAssetAction(formData);
      if (!res.ok) {
        toast.error(res.error || "Upload failed");
        return;
      }

      setAssets((prev) => [res.asset, ...prev]);
      toast.success("Asset uploaded");
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = assets;
    setAssets((p) => p.filter((a) => a.id !== id));
    try {
      const res = await deleteAssetAction(id);
      if (!res.ok) {
        setAssets(prev);
        toast.error(res.error || "Delete failed");
        return;
      }
      toast.success("Asset deleted");
    } catch (err) {
      setAssets(prev);
      toast.error((err as Error).message || "Delete failed");
    }
  }

  function handleDownload(asset: AssetRow) {
    if (!asset.url) {
      toast.error("No file URL available");
      return;
    }
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.name || `atlas-asset-${asset.id}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="logo">Logos</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "flex h-full w-9 items-center justify-center",
                view === "grid" ? "bg-secondary" : "hover:bg-secondary/60",
              )}
              aria-label="Grid view"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex h-full w-9 items-center justify-center border-l border-border",
                view === "list" ? "bg-secondary" : "hover:bg-secondary/60",
              )}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <UploadDialog onUpload={handleUpload} uploading={uploading} />
        </div>
      </div>

      {/* Asset count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} {filtered.length === 1 ? "asset" : "assets"}
          {type !== "all" && (
            <> · filtered by <span className="text-foreground">{TYPE_META[type].label}</span></>
          )}
        </span>
      </div>

      {/* Assets */}
      {!loaded ? (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">
              {assets.length === 0 ? "Your library is empty" : "No assets found"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {assets.length === 0
                ? "Upload your first asset to get started. Atlas will keep it organized and ready to drop into any campaign."
                : "Try clearing your filters to see more assets."}
            </p>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={() => handleDelete(asset.id)}
              onDownload={() => handleDownload(asset)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                onDelete={() => handleDelete(asset.id)}
                onDownload={() => handleDownload(asset)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onDelete,
  onDownload,
}: {
  asset: AssetRow;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const meta = TYPE_META[asset.type];

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-card">
      <div className="aspect-square w-full bg-secondary/40">
        <AssetPreview asset={asset} />
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-medium">{asset.name}</p>
          <meta.icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase">{asset.format ?? "—"}</span>
          <span>{formatSize(asset.size_bytes)}</span>
        </div>
      </div>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          aria-label="Download"
          onClick={onDownload}
        >
          <Download className="h-3 w-3" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          aria-label="Delete"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function AssetRow({
  asset,
  onDelete,
  onDownload,
}: {
  asset: AssetRow;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const meta = TYPE_META[asset.type];
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40">
        <AssetPreview asset={asset} compact />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <meta.icon className={cn("h-3 w-3", meta.color)} />
          <span>{meta.label}</span>
          <span>·</span>
          <span className="uppercase">{asset.format ?? "—"}</span>
          <span>·</span>
          <span>{formatSize(asset.size_bytes)}</span>
          <span>·</span>
          <span>{formatRelativeTime(asset.created_at)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Download"
        onClick={onDownload}
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Delete"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AssetPreview({ asset, compact = false }: { asset: AssetRow; compact?: boolean }) {
  const fallbackPalette: [string, string][] = [
    ["#1e293b", "#475569"],
    ["#3b82f6", "#93c5fd"],
    ["#10b981", "#a7f3d0"],
    ["#f59e0b", "#fde68a"],
    ["#ec4899", "#fbcfe8"],
    ["#8b5cf6", "#ddd6fe"],
    ["#0ea5e9", "#bae6fd"],
    ["#ef4444", "#fecaca"],
  ];

  if (asset.url && (asset.url.startsWith("http") || asset.url.startsWith("https"))) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.url}
        alt={asset.name}
        className={cn("h-full w-full", compact ? "object-cover" : "object-cover")}
      />
    );
  }

  // Generated fallback if URL isn't usable (data URL kept around for legacy rows).
  const idSeed = asset.id
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const [a, b] = fallbackPalette[idSeed % fallbackPalette.length];
  const gradId = `g-${asset.id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label={asset.name}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gradId})`} />
      <text
        x="50"
        y="55"
        fill="rgba(255,255,255,0.6)"
        fontFamily="sans-serif"
        fontSize="6"
        textAnchor="middle"
        fontWeight="600"
      >
        {(asset.format ?? "—").toUpperCase()}
      </text>
    </svg>
  );
}

function UploadDialog({
  onUpload,
  uploading,
}: {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Upload asset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload to library</DialogTitle>
          <DialogDescription>
            Add images, videos, logos, or templates. Atlas will keep them organized and
            ready to use in any campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="upload-input">File</Label>
          <label
            htmlFor="upload-input"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 px-4 py-10 text-center transition-colors hover:bg-secondary/50"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">Drop file or click to browse</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, SVG, MP4 · max 50MB
            </p>
            {uploading && <Skeleton className="mt-2 h-1 w-32" />}
            <input
              id="upload-input"
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={onUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
