import { makeProviderError, type ChatInput, type ChatOutput, type GeneratedImageOutput, type ImageInput } from "./types";

const ENDPOINT_CHAT = "https://api.openai.com/v1/chat/completions";
const ENDPOINT_IMAGES = "https://api.openai.com/v1/images/generations";
const ENDPOINT_MODELS = "https://api.openai.com/v1/models";

export const OPENAI_COPY_MODEL = "gpt-4o-mini";
export const OPENAI_IMAGE_MODEL = "gpt-image-1";

const ASPECT_TO_SIZE: Record<ImageInput["aspectRatio"], string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "16:9": "1536x1024",
  "9:16": "1024x1792",
};

const ASPECT_TO_DIMS: Record<ImageInput["aspectRatio"], { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "16:9": { width: 1536, height: 1024 },
  "9:16": { width: 1024, height: 1792 },
};

const STYLE_HINT: Record<string, string> = {
  photorealistic: "photorealistic, cinematic lighting, sharp detail, editorial-grade",
  illustrated: "modern illustration, vector-style, vibrant palette, crisp lines",
  minimal: "minimalist composition, generous negative space, modern type-led",
  bold: "high-contrast, bold typography, attention-grabbing",
};

// ---------------------------------------------------------------------------
// Chat (ad copy)
// ---------------------------------------------------------------------------

export async function openaiChat(apiKey: string, input: ChatInput): Promise<ChatOutput> {
  const body: Record<string, unknown> = {
    model: OPENAI_COPY_MODEL,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: 0.8,
    max_tokens: 700,
  };
  if (input.jsonMode) body.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(ENDPOINT_CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw makeProviderError("OpenAI request failed", {
      status: 0,
      code: "network",
      cause: err,
    });
  }

  if (!res.ok) {
    const text = await safeText(res);
    throw makeProviderError(`OpenAI chat ${res.status}: ${text}`, {
      status: res.status,
      code: res.status === 401 ? "invalid_key" : res.status === 429 ? "rate_limited" : "provider",
    });
  }

  const json = await res.json();
  const text: string = json?.choices?.[0]?.message?.content ?? "";
  const usage = json?.usage ?? {};
  return {
    text,
    usage: {
      input_tokens: usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Images (ad creatives)
// ---------------------------------------------------------------------------

export async function openaiImages(
  apiKey: string,
  input: ImageInput,
): Promise<GeneratedImageOutput[]> {
  const dims = ASPECT_TO_DIMS[input.aspectRatio];
  const styleHint = input.style ? STYLE_HINT[input.style] ?? input.style : STYLE_HINT.photorealistic;
  const composedPrompt = [
    `Ad creative for: ${input.prompt}.`,
    `Style: ${styleHint}.`,
    `Aspect ratio ${input.aspectRatio} (${dims.width}x${dims.height}px).`,
    "Clear, readable focal subject. Suitable for paid social.",
  ].join(" ");

  let res: Response;
  try {
    res = await fetch(ENDPOINT_IMAGES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt: composedPrompt,
        n: input.count,
        size: ASPECT_TO_SIZE[input.aspectRatio],
      }),
    });
  } catch (err) {
    throw makeProviderError("OpenAI image request failed", {
      status: 0,
      code: "network",
      cause: err,
    });
  }

  if (!res.ok) {
    const text = await safeText(res);
    throw makeProviderError(`OpenAI image ${res.status}: ${text}`, {
      status: res.status,
      code: res.status === 401 ? "invalid_key" : res.status === 429 ? "rate_limited" : "provider",
    });
  }

  const json = await res.json();
  const items: Array<{ b64_json?: string }> = json?.data ?? [];
  const out: GeneratedImageOutput[] = [];
  for (const item of items) {
    if (!item.b64_json) continue;
    out.push({
      url: `data:image/png;base64,${item.b64_json}`,
      width: dims.width,
      height: dims.height,
      prompt: input.prompt,
      usage: { input_tokens: 0, output_tokens: 0, image_count: 1 },
    });
  }

  if (out.length === 0) {
    throw makeProviderError("OpenAI returned no images", { status: 502, code: "empty_response" });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Verify a key cheaply. Hits /v1/models — never bills tokens.
// ---------------------------------------------------------------------------

export async function openaiVerify(apiKey: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT_MODELS, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    return { ok: false, reason: (err as Error).message || "network" };
  }
  if (res.ok) return { ok: true };
  if (res.status === 401) return { ok: false, reason: "Invalid API key (401 unauthorized)" };
  return { ok: false, reason: `OpenAI responded ${res.status}` };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
