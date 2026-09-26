import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { headers } from "next/headers"

import { auth } from "@/lib/better-auth/auth"
import { loadQuantAgentRun } from "@/lib/quantagent/read-api"
import { canAccessQuantAgentResearch, getQuantAgentRun, QuantAgentAccountAccessError } from "@/lib/quantagent/server"

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: vi.fn() }))
vi.mock("@/lib/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }))
vi.mock("@/lib/quantagent/read-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/quantagent/read-api")>()),
  loadQuantAgentRun: vi.fn(),
}))

const ownerId = "owner-user-id"
const runId = "known-run-id"
const getSessionMock = vi.mocked(auth.api.getSession)
const loadRunMock = vi.mocked(loadQuantAgentRun)

function signInAs(id: string) {
  getSessionMock.mockResolvedValue({ user: { id, email: "same@example.test" } } as never)
}

describe("QuantAgent research account gate", () => {
  beforeEach(() => {
    vi.stubEnv("QUANTAGENT_ALLOWED_USER_ID", ownerId)
    vi.stubEnv("QUANTAGENT_API_BASE_URL", "http://127.0.0.1:8765")
    vi.stubEnv("QUANTAGENT_API_BEARER_TOKEN", "test-only-bearer-token-with-at-least-32-characters")
    vi.mocked(headers).mockResolvedValue(new Headers() as never)
    loadRunMock.mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  it.each([undefined, "", " ", ` ${ownerId}`, `${ownerId} `])(
    "denies an unset or non-exact configured ID (%s) before session or backend access",
    async (configuredId) => {
      if (configuredId === undefined) delete process.env.QUANTAGENT_ALLOWED_USER_ID
      else vi.stubEnv("QUANTAGENT_ALLOWED_USER_ID", configuredId)

      await expect(getQuantAgentRun(runId)).rejects.toMatchObject({ code: "access_denied" })
      await expect(getQuantAgentRun(runId)).rejects.toBeInstanceOf(QuantAgentAccountAccessError)
      expect(getSessionMock).not.toHaveBeenCalled()
      expect(loadRunMock).not.toHaveBeenCalled()
    },
  )

  it("denies a missing session before backend access", async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(getQuantAgentRun(runId)).rejects.toMatchObject({ code: "access_denied" })
    expect(loadRunMock).not.toHaveBeenCalled()
  })

  it("denies another user even when the email and run ID are known", async () => {
    signInAs("other-user-id")

    expect(await canAccessQuantAgentResearch()).toBe(false)
    await expect(getQuantAgentRun(runId)).rejects.toMatchObject({ code: "access_denied" })
    expect(loadRunMock).not.toHaveBeenCalled()
  })

  it("fails closed if session lookup fails", async () => {
    getSessionMock.mockRejectedValue(new Error("session store unavailable"))

    await expect(getQuantAgentRun(runId)).rejects.toMatchObject({ code: "access_denied" })
    expect(loadRunMock).not.toHaveBeenCalled()
  })

  it("allows only the exact user ID and forwards the server-side configuration", async () => {
    signInAs(ownerId)

    await getQuantAgentRun(runId)
    expect(loadRunMock).toHaveBeenCalledExactlyOnceWith(runId, {
      baseUrl: "http://127.0.0.1:8765",
      bearerToken: "test-only-bearer-token-with-at-least-32-characters",
    })
  })
})
