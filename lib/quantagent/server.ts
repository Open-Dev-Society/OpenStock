import "server-only"

import { headers } from "next/headers"

import { auth } from "@/lib/better-auth/auth"
import { loadQuantAgentRun, QuantAgentReadError } from "@/lib/quantagent/read-api"

export class QuantAgentAccountAccessError extends QuantAgentReadError {
  constructor() {
    super("access_denied", "Research results are not available to this account")
  }
}

export async function canAccessQuantAgentResearch(): Promise<boolean> {
  const allowedUserId = process.env.QUANTAGENT_ALLOWED_USER_ID
  if (!allowedUserId || allowedUserId.trim() !== allowedUserId) return false

  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user.id === allowedUserId
  } catch {
    return false
  }
}

export async function getQuantAgentRun(runId: string) {
  if (!(await canAccessQuantAgentResearch())) {
    throw new QuantAgentAccountAccessError()
  }

  return loadQuantAgentRun(runId, {
    baseUrl: process.env.QUANTAGENT_API_BASE_URL ?? "http://127.0.0.1:8765",
    bearerToken: process.env.QUANTAGENT_API_BEARER_TOKEN ?? "",
  })
}
