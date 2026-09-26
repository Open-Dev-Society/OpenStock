import { describe, expect, it } from "vitest"

import { loadQuantAgentRun, QuantAgentReadError } from "@/lib/quantagent/read-api"

const baseUrl = process.env.QUANTAGENT_API_BASE_URL
const bearerToken = process.env.QUANTAGENT_API_BEARER_TOKEN
const runId = process.env.QUANTAGENT_LIVE_RUN_ID

async function captureReadError(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(QuantAgentReadError)
    const normalized = error as QuantAgentReadError
    return { ...normalized, message: normalized.message }
  }
  throw new Error("Expected a QuantAgent read error")
}

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
    const authenticationError = await captureReadError(loadQuantAgentRun(selectedRunId, {
      ...config,
      bearerToken: "incorrect-live-test-token-with-at-least-32-characters",
    }))
    expect(authenticationError).toStrictEqual({
      code: "authentication_required",
      message: "QuantAgent request failed with 401",
      name: "QuantAgentReadError",
      status: 401,
    })

    const missingRunError = await captureReadError(loadQuantAgentRun("api-00000000000000000000000000000000", config))
    expect(missingRunError).toStrictEqual({
      code: "run_not_found",
      message: "QuantAgent request failed with 404",
      name: "QuantAgentReadError",
      status: 404,
    })
  })
})
