/**
 * AI Provider abstraction for OpenStock.
 *
 * Supports multiple LLM backends via the AI_PROVIDER environment variable:
 *   - "gemini"  (default) – Google Gemini REST API
 *   - "minimax" – MiniMax (OpenAI-compatible)
 *   - "siray"   – Siray.ai (OpenAI-compatible)
 *
 * Each provider returns a plain-text string from the model.
 */

export type AIProviderName = "gemini" | "minimax" | "siray";

export interface AIProviderConfig {
  name: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Resolve the provider configuration from environment variables.
 */
export function getProviderConfig(
  provider?: AIProviderName
): AIProviderConfig {
  const name =
    provider ||
    (process.env.AI_PROVIDER as AIProviderName) ||
    "gemini";

  switch (name) {
    case "minimax":
      return {
        name: "minimax",
        apiKey: process.env.MINIMAX_API_KEY || "",
        baseUrl:
          process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
        model: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
      };

    case "siray":
      return {
        name: "siray",
        apiKey: process.env.SIRAY_API_KEY || "",
        baseUrl: "https://api.siray.ai/v1",
        model: "siray-1.0-ultra",
      };

    case "gemini":
    default:
      return {
        name: "gemini",
        apiKey: process.env.GEMINI_API_KEY || "",
        baseUrl:
          "https://generativelanguage.googleapis.com/v1beta/models",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      };
  }
}

/**
 * Get the fallback provider: if the primary is Gemini use MiniMax,
 * otherwise fall back to Gemini.
 */
export function getFallbackProviderName(
  primary: AIProviderName
): AIProviderName {
  if (primary === "gemini") {
    // Prefer MiniMax as fallback when a key is available, else Siray
    if (process.env.MINIMAX_API_KEY) return "minimax";
    if (process.env.SIRAY_API_KEY) return "siray";
    return "minimax"; // caller will see missing-key error
  }
  return "gemini";
}

// ── Provider call implementations ──────────────────────────────────

async function callGemini(
  prompt: string,
  config: AIProviderConfig
): Promise<string> {
  if (!config.apiKey) throw new Error("GEMINI_API_KEY is not set");

  const url = `${config.baseUrl}/${config.model}:generateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callOpenAICompatible(
  prompt: string,
  config: AIProviderConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error(
      `${config.name.toUpperCase()}_API_KEY is not set`
    );
  }

  const url = `${config.baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `${config.name} API error: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`${config.name} returned empty response`);
  }
  return text;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Call the configured (or specified) AI provider and return the model
 * response as a plain string.
 */
export async function callAIProvider(
  prompt: string,
  provider?: AIProviderName
): Promise<string> {
  const config = getProviderConfig(provider);

  if (config.name === "gemini") {
    return callGemini(prompt, config);
  }
  // MiniMax and Siray both use OpenAI-compatible endpoints
  return callOpenAICompatible(prompt, config);
}

/**
 * Call the AI provider with automatic fallback.
 * Tries the primary provider first; on failure switches to the fallback.
 */
export async function callAIProviderWithFallback(
  prompt: string
): Promise<string> {
  const primaryName =
    (process.env.AI_PROVIDER as AIProviderName) || "gemini";
  const fallbackName = getFallbackProviderName(primaryName);

  try {
    return await callAIProvider(prompt, primaryName);
  } catch (primaryError) {
    console.error(
      `⚠️ ${primaryName} failed, switching to ${fallbackName} fallback`,
      primaryError
    );
    return await callAIProvider(prompt, fallbackName);
  }
}
