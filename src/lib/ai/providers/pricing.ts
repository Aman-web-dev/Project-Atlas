/**
 * Pricing table — single source of truth for cost estimation.
 *
 * Prices are USD per 1,000 tokens. Update this file when providers change
 * pricing. Numbers here are intentionally conservative (we round UP, not
 * down, when cost could exceed the estimate).
 *
 * For image models that charge per image rather than per token, we expose
 * image_price_usd directly.
 */

import type { Provider } from "./types";

type ModelPricing = {
  /** USD per 1k input tokens. */
  inputPer1k: number;
  /** USD per 1k output tokens. */
  outputPer1k: number;
  /** USD per image (for image models). */
  imagePriceUsd?: number;
};

const TABLE: Record<Provider, Record<string, ModelPricing>> = {
  openai: {
    "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
    "gpt-image-1": { inputPer1k: 0, outputPer1k: 0, imagePriceUsd: 0.04 },
  },
  anthropic: {
    "claude-3-5-sonnet-latest": { inputPer1k: 0.003, outputPer1k: 0.015 },
    "claude-3-5-haiku-latest": { inputPer1k: 0.0008, outputPer1k: 0.004 },
  },
  google: {
    "gemini-1.5-pro": { inputPer1k: 0.00125, outputPer1k: 0.005 },
    "gemini-1.5-flash": { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  },
  minimax: {
    // MiniMax models — see https://platform.MiniMax.io for current pricing.
    "MiniMax-Text-01": { inputPer1k: 0.001, outputPer1k: 0.008 },
    "abab6.5s-chat": { inputPer1k: 0.001, outputPer1k: 0.001 },
    "abab5.5-chat": { inputPer1k: 0.0008, outputPer1k: 0.0008 },
    "image-01": { inputPer1k: 0, outputPer1k: 0, imagePriceUsd: 0.025 },
  },
};

export function estimateCost(
  provider: Provider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  imageCount = 0,
): number {
  const modelPricing = TABLE[provider]?.[model];
  if (!modelPricing) {
    // Unknown model — assume zero so we don't block the user.
    return 0;
  }
  const inputCost = (inputTokens / 1000) * modelPricing.inputPer1k;
  const outputCost = (outputTokens / 1000) * modelPricing.outputPer1k;
  const imageCost = (modelPricing.imagePriceUsd ?? 0) * imageCount;
  return round6(inputCost + outputCost + imageCost);
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function modelList(provider: Provider): string[] {
  return Object.keys(TABLE[provider] ?? {});
}
