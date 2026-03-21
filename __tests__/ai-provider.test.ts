import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getProviderConfig,
  getFallbackProviderName,
  callAIProvider,
  callAIProviderWithFallback,
  type AIProviderName,
} from "@/lib/ai-provider";

// ── getProviderConfig ──────────────────────────────────────────────

describe("getProviderConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to gemini when no env var is set", () => {
    delete process.env.AI_PROVIDER;
    const config = getProviderConfig();
    expect(config.name).toBe("gemini");
    expect(config.baseUrl).toContain("generativelanguage.googleapis.com");
    expect(config.model).toBe("gemini-2.5-flash-lite");
  });

  it("returns minimax config when provider is minimax", () => {
    process.env.MINIMAX_API_KEY = "test-key";
    const config = getProviderConfig("minimax");
    expect(config.name).toBe("minimax");
    expect(config.baseUrl).toBe("https://api.minimax.io/v1");
    expect(config.model).toBe("MiniMax-M2.7");
    expect(config.apiKey).toBe("test-key");
  });

  it("respects MINIMAX_MODEL env var", () => {
    process.env.MINIMAX_MODEL = "MiniMax-M2.5-highspeed";
    const config = getProviderConfig("minimax");
    expect(config.model).toBe("MiniMax-M2.5-highspeed");
  });

  it("respects MINIMAX_BASE_URL env var", () => {
    process.env.MINIMAX_BASE_URL = "https://custom.minimax.example/v1";
    const config = getProviderConfig("minimax");
    expect(config.baseUrl).toBe("https://custom.minimax.example/v1");
  });

  it("returns siray config when provider is siray", () => {
    process.env.SIRAY_API_KEY = "siray-key";
    const config = getProviderConfig("siray");
    expect(config.name).toBe("siray");
    expect(config.baseUrl).toBe("https://api.siray.ai/v1");
    expect(config.model).toBe("siray-1.0-ultra");
    expect(config.apiKey).toBe("siray-key");
  });

  it("reads AI_PROVIDER from env when no argument is given", () => {
    process.env.AI_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "k";
    const config = getProviderConfig();
    expect(config.name).toBe("minimax");
  });

  it("respects GEMINI_MODEL env var", () => {
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    const config = getProviderConfig("gemini");
    expect(config.model).toBe("gemini-2.0-flash");
  });
});

// ── getFallbackProviderName ────────────────────────────────────────

describe("getFallbackProviderName", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns minimax when primary is gemini and MINIMAX_API_KEY is set", () => {
    process.env.MINIMAX_API_KEY = "k";
    expect(getFallbackProviderName("gemini")).toBe("minimax");
  });

  it("returns siray when primary is gemini and only SIRAY_API_KEY is set", () => {
    delete process.env.MINIMAX_API_KEY;
    process.env.SIRAY_API_KEY = "s";
    expect(getFallbackProviderName("gemini")).toBe("siray");
  });

  it("returns gemini when primary is minimax", () => {
    expect(getFallbackProviderName("minimax")).toBe("gemini");
  });

  it("returns gemini when primary is siray", () => {
    expect(getFallbackProviderName("siray")).toBe("gemini");
  });
});

// ── callAIProvider ─────────────────────────────────────────────────

describe("callAIProvider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when GEMINI_API_KEY is missing for gemini provider", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(callAIProvider("hello", "gemini")).rejects.toThrow(
      "GEMINI_API_KEY is not set"
    );
  });

  it("throws when MINIMAX_API_KEY is missing for minimax provider", async () => {
    delete process.env.MINIMAX_API_KEY;
    await expect(callAIProvider("hello", "minimax")).rejects.toThrow(
      "MINIMAX_API_KEY is not set"
    );
  });

  it("throws when SIRAY_API_KEY is missing for siray provider", async () => {
    delete process.env.SIRAY_API_KEY;
    await expect(callAIProvider("hello", "siray")).rejects.toThrow(
      "SIRAY_API_KEY is not set"
    );
  });

  it("calls Gemini API with correct format", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            { content: { parts: [{ text: "Hello from Gemini" }] } },
          ],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callAIProvider("test prompt", "gemini");
    expect(result).toBe("Hello from Gemini");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("key=test-gemini-key");
    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].text).toBe("test prompt");
  });

  it("calls MiniMax API with OpenAI-compatible format", async () => {
    process.env.MINIMAX_API_KEY = "test-minimax-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Hello from MiniMax" } }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callAIProvider("test prompt", "minimax");
    expect(result).toBe("Hello from MiniMax");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.minimax.io/v1/chat/completions");
    expect(options.headers["Authorization"]).toBe(
      "Bearer test-minimax-key"
    );
    const body = JSON.parse(options.body);
    expect(body.model).toBe("MiniMax-M2.7");
    expect(body.messages[0].content).toBe("test prompt");
    expect(body.temperature).toBe(0.7);
  });

  it("calls Siray API with OpenAI-compatible format", async () => {
    process.env.SIRAY_API_KEY = "test-siray-key";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Hello from Siray" } }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callAIProvider("test prompt", "siray");
    expect(result).toBe("Hello from Siray");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.siray.ai/v1/chat/completions");
    expect(options.headers["Authorization"]).toBe("Bearer test-siray-key");
  });

  it("throws on API error response", async () => {
    process.env.GEMINI_API_KEY = "k";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      })
    );

    await expect(callAIProvider("hello", "gemini")).rejects.toThrow(
      "Gemini API error: 429"
    );
  });

  it("throws on empty Gemini response", async () => {
    process.env.GEMINI_API_KEY = "k";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [] }),
      })
    );

    await expect(callAIProvider("hello", "gemini")).rejects.toThrow(
      "Gemini returned empty response"
    );
  });

  it("throws on empty MiniMax response", async () => {
    process.env.MINIMAX_API_KEY = "k";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: {} }] }),
      })
    );

    await expect(callAIProvider("hello", "minimax")).rejects.toThrow(
      "minimax returned empty response"
    );
  });
});

// ── callAIProviderWithFallback ─────────────────────────────────────

describe("callAIProviderWithFallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns primary provider result on success", async () => {
    process.env.AI_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "k";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "MiniMax response" } }],
          }),
      })
    );

    const result = await callAIProviderWithFallback("test");
    expect(result).toBe("MiniMax response");
  });

  it("falls back to secondary provider on primary failure", async () => {
    process.env.AI_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "k";
    process.env.GEMINI_API_KEY = "g";

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes("minimax")) {
          return Promise.resolve({ ok: false, status: 500, statusText: "Error" });
        }
        // Gemini fallback
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                { content: { parts: [{ text: "Gemini fallback" }] } },
              ],
            }),
        });
      })
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await callAIProviderWithFallback("test");
    expect(result).toBe("Gemini fallback");
    expect(callCount).toBe(2);
    consoleSpy.mockRestore();
  });

  it("uses gemini as default primary and minimax as fallback", async () => {
    delete process.env.AI_PROVIDER;
    process.env.GEMINI_API_KEY = "g";
    process.env.MINIMAX_API_KEY = "m";

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes("googleapis")) {
          return Promise.resolve({ ok: false, status: 500, statusText: "Error" });
        }
        // MiniMax fallback
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: "MiniMax fallback" } }],
            }),
        });
      })
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await callAIProviderWithFallback("test");
    expect(result).toBe("MiniMax fallback");
    expect(callCount).toBe(2);
    consoleSpy.mockRestore();
  });

  it("throws when both primary and fallback fail", async () => {
    process.env.AI_PROVIDER = "minimax";
    process.env.MINIMAX_API_KEY = "k";
    process.env.GEMINI_API_KEY = "g";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(callAIProviderWithFallback("test")).rejects.toThrow();
    consoleSpy.mockRestore();
  });
});
