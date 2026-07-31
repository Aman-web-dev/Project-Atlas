"use server";

import { createClient } from "@/lib/supabase/server";
import { executeCopy } from "@/lib/ai/execute";
import { getPersona, type Provider } from "@/lib/supabase/queries";

export interface GenerateCopyActionInput {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  budget?: number;
  platform: string;
  tone: string;
  /** Optional ICP (Ideal Customer Profile) — when present, the prompt is
   *  built around Paul Ajao's framework: pain → desire → product as bridge. */
  personaId?: string | null;
}

export interface GenerateCopyActionResult {
  ok: boolean;
  headlines: string[];
  descriptions: string[];
  ctas: string[];
  costUsd: number;
  reason?: "no_key";
  cap?: { reason: string; used: number; limit: number; scope: string };
  provider?: Provider;
  error?: string;
}

const PLATFORM_GUIDANCE: Record<string, string> = {
  facebook: "Conversational, story-driven, longer descriptions OK.",
  instagram: "Aesthetic, emoji-friendly, lifestyle framing.",
  tiktok: "Casual, punchy, hook-first.",
  linkedin: "Professional, value-led, outcome-focused.",
  google: "Direct, benefit-clear, call-to-action strong.",
  x: "Tight, witty, single-thought.",
  pinterest: "Aspirational, descriptive, keyword-rich.",
};

const TONE_GUIDANCE: Record<string, string> = {
  professional: "Polished, trustworthy, fact-led.",
  casual: "Friendly, everyday, conversational.",
  playful: "Energetic, witty, never cringey.",
  inspiring: "Aspirational, motivational, future-focused.",
  urgent: "Scarcity-aware, action-first, time-bound.",
};

/**
 * Build a system prompt that bakes in the ICP framework (Paul Ajao).
 * The system prompt is the same shape regardless of which provider is
 * ultimately chosen — the executor handles routing to MiniMax / OpenAI.
 */
const SYSTEM_PROMPT = `You are Atlas, the AI advertising copywriter inside an enterprise
ad platform.

You write copy using the Ideal Customer Profile (ICP) framework:

  1. EMPATHISE WITH THE PAIN — open by naming the customer's specific
     frustration in their own words (use the Voice of Customer). People
     move AWAY from pain more strongly than they move toward desire.
  2. SHOW ANOTHER WAY — paint the Desire vividly so the customer can see
     the better future on the other side.
  3. INTRODUCE THE PRODUCT AS THE BRIDGE — frame it as the thing that
     solves the pain and unlocks the desire. The product only matters
     once the customer recognises the problem is real.

If a Persona (ICP) is provided below, every choice — word, angle,
metaphor, CTA — must be calibrated to that specific person's
Desires, Problems, and Voice of Customer.

Always return STRICT JSON of the form:
{
  "headlines":   string[5],   // 6-12 words, scroll-stopping, varied
  "descriptions": string[3],  // 25-50 words each, primary-text length
  "ctas":        string[4]    // 2-3 word imperative verbs / phrases
}

Rules:
  1. Never invent claims that aren't implied by the brief.
  2. Avoid superlatives without support ("world's best" → "trusted by").
  3. Match the platform's native idiom (Facebook ≠ LinkedIn).
  4. Be cost-conscious: output only JSON, no preamble.
  5. If the brief is ambiguous, prefer clarity over cleverness.`;

function buildUserPrompt(input: GenerateCopyActionInput): string {
  const platformHint = PLATFORM_GUIDANCE[input.platform] ?? PLATFORM_GUIDANCE.instagram;
  const toneHint = TONE_GUIDANCE[input.tone ?? "professional"] ?? TONE_GUIDANCE.professional;

  return [
    "Brief",
    "------",
    `Product: ${input.productName}`,
    input.productDescription ? `Description: ${input.productDescription}` : "",
    input.targetAudience ? `Audience: ${input.targetAudience}` : "",
    input.budget ? `Budget (USD): ${input.budget}` : "",
    `Platform: ${input.platform} — ${platformHint}`,
    `Tone: ${input.tone ?? "professional"} — ${toneHint}`,
    "",
    "Output STRICT JSON only. No prose.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Format the ICP block that gets prepended to the user prompt when a
 * persona is selected. Keeps the system prompt stable (same framework
 * regardless of which ICP is in play) and only varies the brief content.
 */
function formatPersonaBlock(persona: {
  name: string;
  demographics: string | null;
  desires: string;
  problems: string;
  voice_of_customer: string;
  notes: string | null;
}): string {
  const lines: string[] = [];
  lines.push("ICP — Ideal Customer Profile");
  lines.push("---------------------------");
  lines.push(`Persona name: ${persona.name}`);
  if (persona.demographics?.trim()) {
    lines.push(`Demographics: ${persona.demographics.trim()}`);
  }
  if (persona.desires.trim()) {
    lines.push("");
    lines.push("Desires (what they want to achieve):");
    lines.push(persona.desires.trim());
  }
  if (persona.problems.trim()) {
    lines.push("");
    lines.push("Problems (pain points to escape — LEAD with these):");
    lines.push(persona.problems.trim());
  }
  if (persona.voice_of_customer.trim()) {
    lines.push("");
    lines.push("Voice of customer (use these phrases verbatim where possible):");
    lines.push(persona.voice_of_customer.trim());
  }
  if (persona.notes?.trim()) {
    lines.push("");
    lines.push(`Notes from the user: ${persona.notes.trim()}`);
  }
  return lines.join("\n");
}

export async function generateCopyAction(
  input: GenerateCopyActionInput,
): Promise<GenerateCopyActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      headlines: [],
      descriptions: [],
      ctas: [],
      costUsd: 0,
      error: "Not signed in.",
    };
  }

  let personaBlock = "";
  if (input.personaId) {
    try {
      const persona = await getPersona(user.id, input.personaId);
      if (persona) {
        personaBlock = formatPersonaBlock(persona);
      }
    } catch (err) {
      console.warn("Failed to load persona", err);
      // Continue without the persona — better to generate something than
      // to block the user on a lookup miss.
    }
  }

  // Persona block goes BEFORE the brief so it's part of the "context"
  // the model reads first, mirroring how a copywriter briefs a junior.
  const userPrompt = [
    personaBlock,
    "", // blank line between ICP and brief
    buildUserPrompt(input),
  ]
    .filter(Boolean)
    .join("\n");

  return executeCopy({
    userId: user.id,
    system: SYSTEM_PROMPT,
    user: userPrompt,
    json: true,
  });
}

// ============================================================================
// Save-to-library action (unchanged from before — the existing copy table).
// ============================================================================
export async function saveCopyAction(payload: {
  product_name: string;
  product_description?: string;
  target_audience?: string;
  budget?: number;
  platform: string;
  headlines: string[];
  descriptions: string[];
  ctas: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { saveGeneratedCopy } = await import("@/lib/supabase/queries");
  try {
    await saveGeneratedCopy(user.id, payload);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
