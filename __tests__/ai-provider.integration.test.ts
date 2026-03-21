import { describe, it, expect, beforeAll } from "vitest";
import { callAIProvider } from "@/lib/ai-provider";

/**
 * Integration tests for AI providers.
 * These tests call real APIs and require valid API keys in environment.
 * Run with: npx vitest run __tests__/ai-provider.integration.test.ts
 */

describe.skipIf(!process.env.MINIMAX_API_KEY)(
  "MiniMax integration",
  () => {
    it("generates a response from MiniMax M2.7", async () => {
      const result = await callAIProvider(
        "Reply with exactly: MINIMAX_OK",
        "minimax"
      );
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }, 30_000);

    it("handles a longer prompt", async () => {
      const result = await callAIProvider(
        "Summarize in one sentence: The stock market is a platform for buying and selling shares of publicly traded companies.",
        "minimax"
      );
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(10);
    }, 30_000);

    it("generates HTML content for email personalization", async () => {
      const result = await callAIProvider(
        'Generate a single HTML <p> tag with a brief personalized welcome message for a tech investor. Return only the HTML, no markdown.',
        "minimax"
      );
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    }, 30_000);
  }
);

describe.skipIf(!process.env.GEMINI_API_KEY)(
  "Gemini integration",
  () => {
    it("generates a response from Gemini", async () => {
      const result = await callAIProvider(
        "Reply with exactly: GEMINI_OK",
        "gemini"
      );
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    }, 30_000);
  }
);
