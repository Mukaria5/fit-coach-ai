/**
 * Centralized AI provider layer (server-only).
 *
 * The rest of the app talks to `aiModel()` / `aiConfig()` and never to a
 * provider SDK directly, so another provider can be added later without
 * touching feature code.
 *
 *   AI Service
 *   ├── Gemini Provider  (AI_PROVIDER=gemini, default)
 *   └── Future OpenAI Provider (AI_PROVIDER=openai)
 *
 * Secrets are read from process.env inside the call, never at module scope,
 * and never reach the browser.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type AiProviderName = "gemini" | "openai";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/** Friendly error surfaced to the UI — never leaks keys or raw provider output. */
export class AiUnavailableError extends Error {
  constructor(message = "The AI coach is temporarily unavailable. Please try again.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/** Retired Gemini model ids Google no longer serves, mapped to their replacement. */
const GEMINI_MODEL_ALIASES: Record<string, string> = {
  "gemini-1.5-flash": DEFAULT_GEMINI_MODEL,
  "gemini-1.5-pro": DEFAULT_GEMINI_MODEL,
  "gemini-2.0-flash": DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash": DEFAULT_GEMINI_MODEL,
  "gemini-2.5-pro": DEFAULT_GEMINI_MODEL,
};

export function aiConfig(): { provider: AiProviderName; model: string } {
  const provider = (process.env["AI_PROVIDER"] ?? "gemini").toLowerCase() as AiProviderName;
  if (provider === "openai") {
    return { provider, model: process.env["OPENAI_MODEL"] ?? DEFAULT_OPENAI_MODEL };
  }
  const configured = process.env["GEMINI_MODEL"]?.trim() || DEFAULT_GEMINI_MODEL;
  return { provider: "gemini", model: GEMINI_MODEL_ALIASES[configured] ?? configured };
}

/**
 * Returns the configured language model. Gemini is used through its
 * OpenAI-compatible endpoint so the AI SDK call sites stay provider-agnostic.
 */
export function aiModel(modelOverride?: string): LanguageModel {
  const { provider, model } = aiConfig();

  if (provider === "openai") {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new AiUnavailableError("AI is not configured.");
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: { Authorization: `Bearer ${apiKey}` },
      supportsStructuredOutputs: true,
    });
    return openai(modelOverride ?? model);
  }

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new AiUnavailableError("AI is not configured.");
  const gemini = createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
    supportsStructuredOutputs: true,
  });
  return gemini(modelOverride ?? model);
}

/** Wraps a provider call so raw provider errors never reach the client. */
export async function withAiErrorHandling<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    console.error("[ai] provider call failed", error);
    throw new AiUnavailableError();
  }
}
