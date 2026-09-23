export type QuantAgentStatus = "running" | "failed" | "completed"

export interface ExactRef {
  id: string
  version: string
}

export interface QuantAgentStep {
  id: string
  plugin_id: string
  plugin_version: string
  capability: string
  output_contract: string
  output_sha256: string
  status: string
}

export interface QuantAgentRunSummary {
  contract_type: "quantagent.read_api.run_summary.v1"
  run_id: string
  recipe: ExactRef
  status: QuantAgentStatus
  started_at: string
  completed_at: string | null
  offline: boolean
  selection: {
    type: "agent"
    agent: ExactRef
    skill: ExactRef
    recipe: ExactRef
  } | null
  steps: QuantAgentStep[]
  final: {
    contract: string
    content_sha256: string
  } | null
  failure_type: string | null
  links: {
    report: string | null
  }
}

export interface ReportClaim {
  claim: string
  status: string
  evidence: string[]
}

export interface ReportEvidence {
  id: string
  stance: string
  impact: string
  source: string
  claims: string[]
  contentSha256: string
}

export interface ReportInvalidation {
  condition: string
  status: string
  evidence: string[]
}

export interface ParsedThesisReport {
  title: string
  thesisId: string
  version: number
  asOf: string
  assessment: string
  researchSuggestion: string
  evidenceSufficient: boolean
  humanReviewed: boolean
  actionEligible: boolean
  coreThesis: string
  claims: ReportClaim[]
  evidence: ReportEvidence[]
  invalidationConditions: ReportInvalidation[]
  missingInformation: string[]
  revision: {
    addedEvidence: string[]
    reasons: string[]
    previousStateSha256: string
    evidenceBundleSha256: string
  }
  scope: string
}

export interface QuantAgentRunResult {
  summary: QuantAgentRunSummary
  report: ParsedThesisReport | null
  rawReport: string | null
}
