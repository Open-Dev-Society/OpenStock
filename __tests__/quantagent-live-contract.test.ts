import { describe, expect, it } from "vitest"

import { loadQuantAgentRun } from "@/lib/quantagent/read-api"

const baseUrl = process.env.QUANTAGENT_API_BASE_URL
const bearerToken = process.env.QUANTAGENT_API_BEARER_TOKEN
const runId = process.env.QUANTAGENT_LIVE_RUN_ID

describe.skipIf(!baseUrl || !bearerToken || !runId)("QuantAgent live read contract", () => {
  const config = { baseUrl: baseUrl!, bearerToken: bearerToken! }
  const selectedRunId = runId!

  it("reads a completed run and integrity-checked report twice without exposing the token", async () => {
    const first = await loadQuantAgentRun(selectedRunId, config)
    const repeated = await loadQuantAgentRun(selectedRunId, config)

    expect(first.summary.run_id).toBe(selectedRunId)
    expect(first.summary.status).toBe("completed")
    expect(first.report).not.toBeNull()
    expect(first.rawReport).toBeTruthy()
    expect(repeated).toEqual(first)
    expect(JSON.stringify(first)).not.toContain(config.bearerToken)
  })

  it("maps authentication and missing-run errors without returning upstream details", async () => {
    await expect(loadQuantAgentRun(selectedRunId, {
      ...config,
      bearerToken: "incorrect-live-test-token-with-at-least-32-characters",
    })).rejects.toMatchObject({ code: "authentication_required", status: 401 })

    await expect(loadQuantAgentRun("api-00000000000000000000000000000000", config))
      .rejects.toMatchObject({ code: "run_not_found", status: 404 })
  })
})
