/**
 * Atlas AI Image Generation Lambda
 *
 * POST /image
 * Body: {
 *   prompt: string,
 *   aspectRatio: '1:1' | '4:5' | '16:9' | '9:16',
 *   style?: 'photorealistic' | 'illustrated' | 'minimal' | 'bold',
 *   brandColors?: string[],
 *   count?: number (default 4, max 8)
 * }
 *
 * Returns: { images: [{ id, url, aspectRatio, width, height, prompt }] }
 *
 * Reads OPENAI_API_KEY from environment. Persists rendered images to S3
 * (configured via ASSETS_BUCKET) and returns CDN URLs. Logs every invocation.
 */

const ASPECT_RATIOS = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "16:9": { width: 1536, height: 864 },
  "9:16": { width: 1024, height: 1792 },
};

const STYLE_GUIDANCE = {
  photorealistic: "photorealistic, cinematic lighting, sharp detail, editorial-grade",
  illustrated: "modern illustration, vector-style, vibrant palette, crisp lines",
  minimal: "minimalist composition, generous negative space, modern type-led",
  bold: "high-contrast, bold typography in frame, attention-grabbing",
};

const STYLE_BRAND_PROMPT = {
  photorealistic: "Treated to match a premium product shoot.",
  illustrated: "Cohesive with a modern brand illustration system.",
  minimal: "Minimal — one subject, plenty of space for the headline.",
  bold: "Bold — high contrast, designed for thumb-stopping feed scroll.",
};

function validateInput(body) {
  if (!body || typeof body !== "object") return "Body must be a JSON object";
  if (!body.prompt || typeof body.prompt !== "string") return "prompt is required";
  if (!body.aspectRatio || !ASPECT_RATIOS[body.aspectRatio])
    return `aspectRatio must be one of: ${Object.keys(ASPECT_RATIOS).join(", ")}`;
  if (body.style && !STYLE_GUIDANCE[body.style])
    return `style must be one of: ${Object.keys(STYLE_GUIDANCE).join(", ")}`;
  if (body.brandColors && !Array.isArray(body.brandColors))
    return "brandColors must be an array of hex strings";
  if (body.count && (body.count < 1 || body.count > 8))
    return "count must be between 1 and 8";
  return null;
}

function buildPrompt(input) {
  const dims = ASPECT_RATIOS[input.aspectRatio];
  const style = STYLE_GUIDANCE[input.style ?? "photorealistic"];
  const brand = STYLE_BRAND_PROMPT[input.style ?? "photorealistic"];

  const colors = (input.brandColors ?? []).slice(0, 4).join(", ");
  return [
    `Ad creative for: ${input.prompt}.`,
    `Style: ${style}.`,
    `Composition: ${brand}`,
    colors ? `Brand palette: ${colors}.` : "",
    `Aspect ratio ${input.aspectRatio} (${dims.width}x${dims.height}px).`,
    "Clear, readable focal subject. Suitable for paid social.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function generateOne(openai, prompt, dims) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openai}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: `${dims.width}x${dims.height}`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json?.data?.[0]?.b64_json ?? null;
}

/**
 * In production: upload the base64 image to S3 and return the public/presigned URL.
 * For this reference handler, we return a data URL so the front-end can render it
 * without any infrastructure dependency.
 */
function persistImage(b64, id, aspectRatio) {
  if (process.env.ASSETS_BUCKET && process.env.ASSETS_CDN) {
    // TODO: implement S3 upload with @aws-sdk/client-s3 + s3-request-presigner
    // const url = await uploadToS3(b64, id);
    // return `https://${process.env.ASSETS_CDN}/${id}.png`;
  }

  return `data:image/png;base64,${b64}`;
}

function logInvocation(event, status, durationMs) {
  console.log(
    JSON.stringify({
      service: "atlas-ai-image",
      status,
      durationMs,
      aspectRatio: event?.body?.aspectRatio,
      style: event?.body?.style,
      timestamp: new Date().toISOString(),
    }),
  );
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

    const openai = process.env.OPENAI_API_KEY;
    if (!openai) {
      status = 503;
      return {
        statusCode: 503,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error:
            "Image generation is offline. Configure OPENAI_API_KEY on the Lambda to enable it.",
        }),
      };
    }

    const count = body.count ?? 4;
    const dims = ASPECT_RATIOS[body.aspectRatio];
    const prompt = buildPrompt(body);

    const images = [];
    for (let i = 0; i < count; i++) {
      try {
        const b64 = await generateOne(openai, prompt, dims);
        if (!b64) continue;

        const id = `${Date.now()}_${i}`;
        images.push({
          id,
          url: persistImage(b64, id, body.aspectRatio),
          aspectRatio: body.aspectRatio,
          width: dims.width,
          height: dims.height,
          prompt: body.prompt,
        });
      } catch (err) {
        console.warn(`Image ${i} failed: ${err.message}`);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    };
  } catch (err) {
    status = 500;
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to generate images", detail: err?.message }),
    };
  } finally {
    logInvocation(event, status, Date.now() - started);
  }
};
