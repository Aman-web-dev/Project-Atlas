import { z } from "zod";

export const generateCopySchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  budget: z.number().min(0).optional(),
  platform: z.enum([
    "facebook",
    "instagram",
    "tiktok",
    "linkedin",
    "google",
    "x",
    "pinterest",
  ]),
  tone: z.enum([
    "professional",
    "casual",
    "playful",
    "inspiring",
    "urgent",
  ]).default("professional"),
});

export type GenerateCopyInput = z.infer<typeof generateCopySchema>;

export interface GeneratedCopy {
  headlines: string[];
  descriptions: string[];
  ctas: string[];
}

export async function generateCopy(input: GenerateCopyInput): Promise<GeneratedCopy> {
  const lambdaUrl = process.env.NEXT_PUBLIC_LAMBDA_AI_COPY_URL;

  // If the Lambda URL is configured, hit the real backend.
  if (lambdaUrl) {
    const res = await fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      throw new Error(`AI copy service returned ${res.status}`);
    }

    const data = await res.json();
    return {
      headlines: data.headlines ?? [],
      descriptions: data.descriptions ?? [],
      ctas: data.ctas ?? [],
    };
  }

  // Fallback: heuristic generator used until the Lambda is wired up.
  // This keeps the UI fully functional during local development.
  await new Promise((r) => setTimeout(r, 1500));

  const { productName, platform, tone } = input;
  const toneStyles: Record<string, { power: string[]; action: string[] }> = {
    professional: {
      power: ["trusted", "proven", "reliable"],
      action: ["Discover", "Learn more", "Get started"],
    },
    casual: {
      power: ["easy", "everyday", "no-fuss"],
      action: ["Try it", "See for yourself", "Grab yours"],
    },
    playful: {
      power: ["fun", "wild", "ridiculously good"],
      action: ["Let's go", "Show me", "Treat yourself"],
    },
    inspiring: {
      power: ["transformative", "limitless", "powerful"],
      action: ["Start today", "Unlock yours", "Begin"],
    },
    urgent: {
      power: ["limited", "exclusive", "today-only"],
      action: ["Shop now", "Don't miss out", "Claim yours"],
    },
  };

  const styles = toneStyles[tone];

  const headlines = [
    `Meet ${productName} — ${styles.power[0]}.`,
    `${productName}: ${styles.power[0]} results, no compromise.`,
    `The world's most ${styles.power[1]} way to ${productName.toLowerCase().includes("the ") ? "use" : "experience"} ${productName.replace(/^the /i, "")}.`,
    `Why ${productName} is the ${styles.power[0]} choice for ${new Date().getFullYear()}.`,
    `${styles.power[2].charAt(0).toUpperCase() + styles.power[2].slice(1)}. Just ${productName}.`,
  ];

  const descriptions = [
    `${productName} is built for the way you actually live. ${styles.power[0].charAt(0).toUpperCase() + styles.power[0].slice(1)}, tested, and ready.`,
    `Get ${styles.power[1]} performance from a product designed to fit into your routine. ${productName} just works.`,
    `Tired of the alternatives? ${productName} delivers ${styles.power[2]} quality — without the complexity.`,
  ];

  const ctas = styles.action;

  return { headlines, descriptions, ctas };
}
