import { AlertTriangle } from "lucide-react"

import type { QuantAgentReadErrorCode } from "@/lib/quantagent/read-api"

const ERROR_COPY: Record<QuantAgentReadErrorCode, { title: string; description: string }> = {
  configuration_error: {
    title: "Research connection is not configured",
    description: "Set the server-only QuantAgent API URL and bearer token, then retry this read.",
  },
  authentication_required: {
    title: "QuantAgent authentication failed",
    description: "The server-side bearer credential was rejected. No credential was sent to the browser.",
  },
  access_denied: {
    title: "This result is not available to this account",
    description: "Research access is limited to the configured OpenStock account, or QuantAgent denied this run.",
  },
  run_not_found: {
    title: "Run not found",
    description: "Check the exact run ID and confirm that the run exists in the configured QuantAgent root.",
  },
  result_unavailable: {
    title: "Report is not available",
    description: "The run exists, but it does not yet expose a completed Markdown result.",
  },
  artifact_integrity_error: {
    title: "Result integrity check failed",
    description: "QuantAgent rejected the stored packet or report. The unverified content was not displayed.",
  },
  upstream_unavailable: {
    title: "QuantAgent is unavailable",
    description: "The read-only service could not be reached. Confirm the loopback service is running and retry.",
  },
  invalid_response: {
    title: "Unsupported QuantAgent response",
    description: "The response did not match the expected summary or thesis-report contract.",
  },
  invalid_run_id: {
    title: "Invalid run ID",
    description: "Use 1–128 letters, numbers, dots, underscores, or hyphens; the first character must be alphanumeric.",
  },
}

export function ResearchErrorState({ code }: { code: QuantAgentReadErrorCode }) {
  const copy = ERROR_COPY[code]
  return (
    <div className="research-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div>
        <p className="research-error-code">{code.replaceAll("_", " ")}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
    </div>
  )
}
