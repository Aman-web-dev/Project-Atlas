import { z } from "zod";

export const ASPECT_RATIOS = [
  { value: "1:1", label: "Square", width: 1080, height: 1080, hint: "Instagram feed, Facebook" },
  { value: "4:5", label: "Portrait", width: 1080, height: 1350, hint: "Instagram portrait" },
  { value: "16:9", label: "Landscape", width: 1920, height: 1080, hint: "YouTube, Display ads" },
  { value: "9:16", label: "Story / Reel", width: 1080, height: 1920, hint: "Stories, Reels, TikTok" },
] as const;

export const generateImageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  aspectRatio: z.enum(["1:1", "4:5", "16:9", "9:16"]),
  style: z.enum(["photorealistic", "illustrated", "minimal", "bold"]).default("photorealistic"),
  brandColors: z.array(z.string()).optional(),
  productImageUrl: z.string().optional(),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;

export interface GeneratedImage {
  id: string;
  url: string;
  aspectRatio: string;
  width: number;
  height: number;
  prompt: string;
}

export async function generateImages(
  input: Omit<GenerateImageInput, "productImageUrl"> & {
    aspectRatio: "1:1" | "4:5" | "16:9" | "9:16";
    count?: number;
  },
): Promise<GeneratedImage[]> {
  const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_AI_IMAGE_URL;

  if (lambdaUrl) {
    const res = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      throw new Error(`AI image service returned ${res.status}`);
    }

    const data = await res.json();
    return (data.images ?? []) as GeneratedImage[];
  }

  // Fallback: deterministic placeholder images (SVG data URLs) so the UI
  // works end-to-end without a backend. These respect aspect ratio and style.
  await new Promise((r) => setTimeout(r, 2200));

  const dimensions = ASPECT_RATIOS.find((a) => a.value === input.aspectRatio)!;

  const palettes: Record<string, string[]> = {
    photorealistic: ["#0a0a0a", "#1e1e1e", "#3a3a3a", "#525252"],
    illustrated: ["#1e3a8a", "#3b82f6", "#93c5fd", "#dbeafe"],
    minimal: ["#fafafa", "#e4e4e7", "#71717a", "#18181b"],
    bold: ["#dc2626", "#f97316", "#facc15", "#7c2d12"],
  };

  const palette = palettes[input.style] ?? palettes.photorealistic;

  const count = input.count ?? 4;
  return Array.from({ length: count }).map((_, idx) => {
    const c1 = palette[idx % palette.length];
    const c2 = palette[(idx + 1) % palette.length];
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}" width="${dimensions.width}" height="${dimensions.height}">
  <defs>
    <linearGradient id="g${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
  </defs>
  <rect width="${dimensions.width}" height="${dimensions.height}" fill="url(#g${idx})" />
  <text x="${dimensions.width / 2}" y="${dimensions.height / 2}" fill="white" font-family="sans-serif" font-size="48" text-anchor="middle" dominant-baseline="middle" opacity="0.6">
    ${input.aspectRatio}
  </text>
</svg>`.trim();

    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    return {
      id: `gen_${Date.now()}_${idx}`,
      url: dataUrl,
      aspectRatio: input.aspectRatio,
      width: dimensions.width,
      height: dimensions.height,
      prompt: input.prompt,
    };
  });
}
