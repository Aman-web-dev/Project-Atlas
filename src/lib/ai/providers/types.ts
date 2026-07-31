/**
 * Shared types for the BYOK provider layer.
 * Every concrete provider implements the same shape so the server actions
 * can switch on provider without leaking vendor-specific code.
 */

export type Provider = "openai" | "anthropic" | "google" | "minimax";

export type Feature = "copy" | "image";

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface ChatInput {
  system: string;
  user: string;
  /** For providers that need it (e.g. JSON-mode). */
  jsonMode?: boolean;
}

export interface ChatOutput {
  text: string;
  usage: TokenUsage;
}

export interface ImageInput {
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "16:9" | "9:16";
  style?: string;
  /** Optional reference image as a data URL or public URL. */
  referenceImage?: string;
  count: number;
}

export interface GeneratedImageOutput {
  /** Always a data URL — the action persists the bytes to Supabase Storage. */
  url: string;
  width: number;
  height: number;
  prompt: string;
  usage: TokenUsage & { image_count: number };
}

export interface ProviderError extends Error {
  status?: number;
  code?: string;
}

export function makeProviderError(
  message: string,
  opts: { status?: number; code?: string; cause?: unknown } = {},
): ProviderError {
  const err = new Error(message) as ProviderError;
  err.name = "ProviderError";
  if (opts.status !== undefined) err.status = opts.status;
  if (opts.code) err.code = opts.code;
  if (opts.cause !== undefined) (err as Error & { cause?: unknown }).cause = opts.cause;
  return err;
}
