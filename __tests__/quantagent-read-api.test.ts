import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it, vi } from "vitest"

import {
  loadQuantAgentRun,
  normalizeQuantAgentBaseUrl,
  QuantAgentReadError,
} from "@/lib/quantagent/read-api"

const token = "p3b-test-token-with-at-least-32-characters"
const report = readFileSync(resolve(__dirname, "fixtures/quantagent-thesis-report.md"), "utf8")
const runId = "20260923T005454Z-b3cfb532"

const summary = {
  contract_type: "quantagent.read_api.run_summary.v1",
  run_id: runId,
  recipe: { id: "thesis-tracker", version: "1.0.0" },
  status: "completed",
  started_at: "2026-09-23T00:54:54.865603+00:00",
  completed_at: "2026-09-23T00:54:54.907952+00:00",
  offline: true,
  selection: {
    type: "agent",
    agent: { id: "builtin.research-agent", version: "1.0.0" },
    skill: { id: "anthropic-financial-services-adapted.thesis-tracker", version: "1.0.0" },
    recipe: { id: "thesis-tracker", version: "1.0.0" },
  },
  steps: [
    ["load-thesis-review", "builtin.json-thesis-review-source", "source.thesis_review", "quantagent.thesis_review_input.v1", "3c45ce928153d1d43ab299355d05b5803909e5732a77c7e64b774734d752e7d6"],
    ["update-thesis-state", "builtin.deterministic-thesis-tracker", "research.thesis_update", "quantagent.thesis_state.v1", "ef2de1d2ed0d9b9009a621958d20fb5f87bb9e72f4bd6a5195ab59100195bbc5"],
    ["write-thesis-report", "builtin.markdown-thesis-report", "report.thesis", "quantagent.report.v1", "2c8d46ab54b1d000b8fd46d4f419aa60d654f37baeab1c55c90642f44e7e5f8b"],
  ].map(([id, plugin_id, capability, output_contract, output_sha256]) => ({
    id,
    plugin_id,
    plugin_version: "1.0.0",
    capability,
    output_contract,
    output_sha256,
    status: "completed",
  })),
  final: {
    contract: "quantagent.report.v1",
    content_sha256: "2c8d46ab54b1d000b8fd46d4f419aa60d654f37baeab1c55c90642f44e7e5f8b",
  },
  failure_type: null,
  links: { report: `/api/v1/runs/${runId}/report` },
}

function fixtureFetch() {
  return vi.fn<typeof fetch>(async (input) => {
    const url = input.toString()
    if (url.endsWith("/report")) {
      return new Response(report, { status: 200, headers: { "content-type": "text/markdown" } })
    }
    return new Response(JSON.stringify(summary), { status: 200, headers: { "content-type": "application/json" } })
  })
}

describe("QuantAgent read API adapter", () => {
  it("uses only authenticated no-store GETs and returns no credential", async () => {
    const fetchMock = fixtureFetch()
    const result = await loadQuantAgentRun(runId, { baseUrl: "http://127.0.0.1:8765", bearerToken: token }, fetchMock)

    expect(result.report?.assessment).toBe("weakened")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.method).toBe("GET")
      expect(init?.body).toBeUndefined()
      expect(init?.cache).toBe("no-store")
      expect(init?.redirect).toBe("error")
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${token}`)
    }
    expect(JSON.stringify(result)).not.toContain(token)
  })

  it("repeating the read cannot create or duplicate a task", async () => {
    const fetchMock = fixtureFetch()
    const config = { baseUrl: "http://localhost:8765", bearerToken: token }

    await loadQuantAgentRun(runId, config, fetchMock)
    await loadQuantAgentRun(runId, config, fetchMock)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true)
  })

  it("rejects invalid IDs before any network access", async () => {
    const fetchMock = fixtureFetch()
    await expect(loadQuantAgentRun("../secret", { baseUrl: "http://127.0.0.1:8765", bearerToken: token }, fetchMock)).rejects.toMatchObject({ code: "invalid_run_id" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("maps public upstream errors without echoing their body", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ error: { code: "run_not_found", message: "private path" } }), { status: 404 }))

    await expect(loadQuantAgentRun("missing-run", { baseUrl: "http://127.0.0.1:8765", bearerToken: token }, fetchMock)).rejects.toMatchObject({ code: "run_not_found", status: 404 })
  })

  it("allows loopback HTTP but rejects remote plaintext and URL credentials", () => {
    expect(normalizeQuantAgentBaseUrl("http://127.0.0.1:8765").origin).toBe("http://127.0.0.1:8765")
    expect(() => normalizeQuantAgentBaseUrl("http://example.com")).toThrow(QuantAgentReadError)
    expect(() => normalizeQuantAgentBaseUrl("https://token@example.com")).toThrow(QuantAgentReadError)
  })
})
