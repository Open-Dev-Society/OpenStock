import "server-only"

import { loadQuantAgentRun } from "@/lib/quantagent/read-api"

export function getQuantAgentRun(runId: string) {
  return loadQuantAgentRun(runId, {
    baseUrl: process.env.QUANTAGENT_API_BASE_URL ?? "http://127.0.0.1:8765",
    bearerToken: process.env.QUANTAGENT_API_BEARER_TOKEN ?? "",
  })
}
