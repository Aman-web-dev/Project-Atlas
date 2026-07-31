import {
  makeProviderError,
  type ChatInput,
  type ChatOutput,
  type GeneratedImageOutput,
  type ImageInput,
} from "./types";

// MiniMax (MiniMax) API endpoints.
// Docs: https://platform.MiniMax.io/docs
const ENDPOINT_CHAT = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const ENDPOINT_IMAGES = "https://api.minimax.chat/v1/image_generation";
// We don't know a public list-models endpoint for MiniMax, so verify uses a
// tiny chat-completion probe with a tiny max_tokens budget.
const ENDPOINT_MODELS_PROXY = ENDPOINT_CHAT;

export const MINIMAX_COPY_MODEL = "MiniMax-Text-01";
export const MINIMAX_IMAGE_MODEL = "image-01";

const ASPECT_TO_SIZE: Record<ImageInput["aspectRatio"], string> = {
  "1:1": "1024x1024",
  "4:5": "768x1024",
  "16:9": "1280x720",
  "9:16": "720x1280",
};

const ASPECT_TO_DIMS: Record<ImageInput["aspectRatio"], { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 768, height: 1024 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
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

export async function minimaxChat(
  apiKey: string,
  input: ChatInput,
): Promise<ChatOutput> {
  const body: Record<string, unknown> = {
    model: MINIMAX_COPY_MODEL,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: 0.8,
    max_tokens: 2048,
    stream: false,
  };
  // MiniMax supports JSON-style responses when the model is told to.
  // We piggyback on the model's instruction-following rather than a flag,
  // because MiniMax doesn't expose `response_format`.

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
    throw makeProviderError("MiniMax request failed", {
      status: 0,
      code: "network",
      cause: err,
    });
  }

  if (!res.ok) {
    const text = await safeText(res);
    throw makeProviderError(`MiniMax chat ${res.status}: ${text}`, {
      status: res.status,
      code: res.status === 401 ? "invalid_key" : res.status === 429 ? "rate_limited" : "provider",
    });
  }

  const json = await res.json();
  // MiniMax chat returns { choices: [{ message: { content } }], usage: {...} }
  // but the exact shape varies — accept several common shapes.
  const text: string =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    (typeof json?.reply === "string" ? json.reply : "") ??
    "";

  const usage = json?.usage ?? {};
  return {
    text,
    usage: {
      input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Images (ad creatives)
// ---------------------------------------------------------------------------

export async function minimaxImages(
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

  // MiniMax image endpoint accepts a single prompt + size at a time and
  // returns one base64 image. We loop to honour the requested `count`.
  const out: GeneratedImageOutput[] = [];
  for (let i = 0; i < input.count; i++) {
    let res: Response;
    try {
      res = await fetch(ENDPOINT_IMAGES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MINIMAX_IMAGE_MODEL,
          prompt: composedPrompt,
          width: dims.width,
          height: dims.height,
        }),
      });
    } catch (err) {
      throw makeProviderError("MiniMax image request failed", {
        status: 0,
        code: "network",
        cause: err,
      });
    }

    if (!res.ok) {
      const text = await safeText(res);
      throw makeProviderError(`MiniMax image ${res.status}: ${text}`, {
        status: res.status,
        code:
          res.status === 401 ? "invalid_key" : res.status === 429 ? "rate_limited" : "provider",
      });
    }

    const json = await res.json();
    // MiniMax image returns { data: { image: [{ b64_json, url }] } }
    // or { image_base64: "..." } depending on the endpoint version. Accept
    // both shapes.
    const b64: string | undefined =
      json?.data?.image?.[0]?.b64_json ??
      json?.data?.image?.[0]?.image_base64 ??
      json?.data?.[0]?.b64_json ??
      json?.image_base64 ??
      (typeof json?.data?.image?.[0]?.url === "string" &&
      json.data.image[0].url.startsWith("data:image/")
        ? json.data.image[0].url.split(",")[1]
        : undefined);

    if (!b64) {
      // Skip this image but keep going — provider may return fewer than `count`.
      continue;
    }

    out.push({
      url: `data:image/png;base64,${b64}`,
      width: dims.width,
      height: dims.height,
      prompt: input.prompt,
      usage: { input_tokens: 0, output_tokens: 0, image_count: 1 },
    });
  }

  if (out.length === 0) {
    throw makeProviderError("MiniMax returned no images", {
      status: 502,
      code: "empty_response",
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Verify (cheap chat-completion probe with tiny budget)
// ---------------------------------------------------------------------------

export async function minimaxVerify(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT_MODELS_PROXY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MINIMAX_COPY_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
    });
  } catch (err) {
    return { ok: false, reason: (err as Error).message || "network" };
  }
  if (res.ok) return { ok: true };
  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: `Invalid API key (${res.status} unauthorized)` };
  }
  return { ok: false, reason: `MiniMax responded ${res.status}` };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
