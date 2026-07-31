/**
 * Atlas AI Copy Generation Lambda
 *
 * POST /copy
 * Body: {
 *   productName: string,
 *   productDescription?: string,
 *   targetAudience?: string,
 *   budget?: number,
 *   platform: 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'google' | 'x' | 'pinterest',
 *   tone?: 'professional' | 'casual' | 'playful' | 'inspiring' | 'urgent'
 * }
 *
 * Returns: { headlines: string[], descriptions: string[], ctas: string[] }
 *
 * Reads OPENAI_API_KEY from environment. Logs every invocation to CloudWatch.
 * Implements cost-consciousness rules from idea.md.
 */

const PLATFORM_GUIDANCE = {
  facebook: "Conversational, story-driven, longer descriptions OK.",
  instagram: "Aesthetic, emoji-friendly, lifestyle framing.",
  tiktok: "Casual, punchy, hook-first.",
  linkedin: "Professional, value-led, outcome-focused.",
  google: "Direct, benefit-clear, call-to-action strong.",
  x: "Tight, witty, single-thought.",
  pinterest: "Aspirational, descriptive, keyword-rich.",
};

const TONE_GUIDANCE = {
  professional: "Polished, trustworthy, fact-led.",
  casual: "Friendly, everyday, conversational.",
  playful: "Energetic, witty, never cringey.",
  inspiring: "Aspirational, motivational, future-focused.",
  urgent: "Scarcity-aware, action-first, time-bound.",
};

const SYSTEM_PROMPT = `You are Atlas, the AI advertising copywriter inside an enterprise
ad platform. Generate on-brand, conversion-tested ad copy.

Always return STRICT JSON of the form:
{
  "headlines": string[5],    // 6-12 words, scroll-stopping, varied
  "descriptions": string[3],  // 25-50 words each, primary-text length
  "ctas": string[4]          // 2-3 word imperative verbs / phrases
}

Rules:
1. Never invent claims that aren't implied by the brief.
2. Avoid superlatives without support ("world's best" → "trusted by").
3. Match the platform's native idiom (Facebook ≠ LinkedIn).
4. Be cost-conscious: output only JSON, no preamble.
5. If the brief is ambiguous, prefer clarity over cleverness.`;

function buildUserPrompt(input) {
  const platformHint = PLATFORM_GUIDANCE[input.platform] ?? PLATFORM_GUIDANCE.instagram;
  const toneHint = TONE_GUIDANCE[input.tone ?? "professional"] ?? TONE_GUIDANCE.professional;

  return `Brief
------
Product: ${input.productName}
${input.productDescription ? `Description: ${input.productDescription}` : ""}
${input.targetAudience ? `Audience: ${input.targetAudience}` : ""}
${input.budget ? `Budget (USD): ${input.budget}` : ""}
Platform: ${input.platform} — ${platformHint}
Tone: ${input.tone ?? "professional"} — ${toneHint}

Output STRICT JSON only. No prose.`;
}

async function callOpenAI(messages, apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

function logInvocation(event, status, durationMs) {
  console.log(
    JSON.stringify({
      service: "atlas-ai-copy",
      status,
      durationMs,
      platform: event?.body?.platform,
      tone: event?.body?.tone,
      timestamp: new Date().toISOString(),
    }),
  );
}

function validateInput(body) {
  if (!body || typeof body !== "object") {
    return "Body must be a JSON object";
  }
  if (!body.productName || typeof body.productName !== "string") {
    return "productName is required";
  }
  if (!body.platform || !PLATFORM_GUIDANCE[body.platform]) {
    return `platform must be one of: ${Object.keys(PLATFORM_GUIDANCE).join(", ")}`;
  }
  if (body.tone && !TONE_GUIDANCE[body.tone]) {
    return `tone must be one of: ${Object.keys(TONE_GUIDANCE).join(", ")}`;
  }
  return null;
}

function fallbackCopy(input) {
  const p = input.productName;
  return {
    headlines: [
      `Meet ${p}.`,
      `${p}, reimagined.`,
      `Built for the way you live.`,
      `Finally, ${p} done right.`,
      `${p}. Just better.`,
    ],
    descriptions: [
      `${p} is the easiest way to get more from your day — without compromising on what matters.`,
      `Designed for people who don't have time to settle. ${p} delivers on every detail.`,
      `Thousands of teams already trust ${p} to power their growth. Try it and see the difference.`,
    ],
    ctas: ["Get started", "Learn more", "Try it free", "See pricing"],
  };
}

exports.handler = async (event) => {
  const started = Date.now();
  let status = 200;

  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? {};
    const error = validateInput(body);

    if (error) {
      status = 400;
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY missing — returning fallback copy");
      const data = fallbackCopy(body);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(body) },
    ];

    const result = await callOpenAI(messages, apiKey);

    const data = {
      headlines: Array.isArray(result.headlines) ? result.headlines : [],
      descriptions: Array.isArray(result.descriptions) ? result.descriptions : [],
      ctas: Array.isArray(result.ctas) ? result.ctas : [],
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    status = 500;
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to generate copy",
        detail: err?.message ?? "Unknown",
      }),
    };
  } finally {
    logInvocation(event, status, Date.now() - started);
  }
};
