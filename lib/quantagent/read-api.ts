import { parseThesisReport } from "@/lib/quantagent/report"
import type {
  ExactRef,
  QuantAgentRunResult,
  QuantAgentRunSummary,
  QuantAgentStep,
} from "@/lib/quantagent/types"

const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const SHA256 = /^[a-f0-9]{64}$/
const MAX_SUMMARY_LENGTH = 2 * 1024 * 1024
const MAX_REPORT_LENGTH = 4 * 1024 * 1024

export type QuantAgentReadErrorCode =
  | "configuration_error"
  | "authentication_required"
  | "access_denied"
  | "run_not_found"
  | "result_unavailable"
  | "artifact_integrity_error"
  | "upstream_unavailable"
  | "invalid_response"
  | "invalid_run_id"

export class QuantAgentReadError extends Error {
  constructor(
    public readonly code: QuantAgentReadErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = "QuantAgentReadError"
  }
}

export interface QuantAgentReadConfig {
  baseUrl: string
  bearerToken: string
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new QuantAgentReadError("invalid_response", `Invalid ${label}`)
  }
  return value as Record<string, unknown>
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new QuantAgentReadError("invalid_response", `Invalid ${label}`)
  }
  return value
}

function exactRef(value: unknown, label: string): ExactRef {
  const item = record(value, label)
  return { id: string(item.id, `${label}.id`), version: string(item.version, `${label}.version`) }
}

function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : string(value, label)
}

function sha256(value: unknown, label: string): string {
  const result = string(value, label)
  if (!SHA256.test(result)) throw new QuantAgentReadError("invalid_response", `Invalid ${label}`)
  return result
}

function timestamp(value: unknown, label: string): string {
  const result = string(value, label)
  if (Number.isNaN(Date.parse(result))) throw new QuantAgentReadError("invalid_response", `Invalid ${label}`)
  return result
}

export function parseRunSummary(value: unknown): QuantAgentRunSummary {
  const payload = record(value, "run summary")
  if (payload.contract_type !== "quantagent.read_api.run_summary.v1") {
    throw new QuantAgentReadError("invalid_response", "Unsupported QuantAgent summary contract")
  }
  const status = payload.status
  if (status !== "running" && status !== "failed" && status !== "completed") {
    throw new QuantAgentReadError("invalid_response", "Invalid QuantAgent run status")
  }
  if (!Array.isArray(payload.steps)) throw new QuantAgentReadError("invalid_response", "Invalid run steps")
  const steps: QuantAgentStep[] = payload.steps.map((value, index) => {
    const item = record(value, `steps[${index}]`)
    return {
      id: string(item.id, "step.id"),
      plugin_id: string(item.plugin_id, "step.plugin_id"),
      plugin_version: string(item.plugin_version, "step.plugin_version"),
      capability: string(item.capability, "step.capability"),
      output_contract: string(item.output_contract, "step.output_contract"),
      output_sha256: sha256(item.output_sha256, "step.output_sha256"),
      status: string(item.status, "step.status"),
    }
  })
  const selectionValue = payload.selection
  const selection = selectionValue === null ? null : (() => {
    const item = record(selectionValue, "selection")
    if (item.type !== "agent") throw new QuantAgentReadError("invalid_response", "Invalid selection type")
    return {
      type: "agent" as const,
      agent: exactRef(item.agent, "selection.agent"),
      skill: exactRef(item.skill, "selection.skill"),
      recipe: exactRef(item.recipe, "selection.recipe"),
    }
  })()
  const finalValue = payload.final
  const final = finalValue === null ? null : (() => {
    const item = record(finalValue, "final")
    return { contract: string(item.contract, "final.contract"), content_sha256: sha256(item.content_sha256, "final.content_sha256") }
  })()
  const links = record(payload.links, "links")
  const runId = string(payload.run_id, "run_id")
  if (!RUN_ID.test(runId)) throw new QuantAgentReadError("invalid_response", "Invalid run_id")
  if (typeof payload.offline !== "boolean") throw new QuantAgentReadError("invalid_response", "Invalid offline flag")
  return {
    contract_type: "quantagent.read_api.run_summary.v1",
    run_id: runId,
    recipe: exactRef(payload.recipe, "recipe"),
    status,
    started_at: timestamp(payload.started_at, "started_at"),
    completed_at: payload.completed_at === null ? null : timestamp(payload.completed_at, "completed_at"),
    offline: payload.offline,
    selection,
    steps,
    final,
    failure_type: nullableString(payload.failure_type, "failure_type"),
    links: { report: nullableString(links.report, "links.report") },
  }
}

export function normalizeQuantAgentBaseUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new QuantAgentReadError("configuration_error", "QUANTAGENT_API_BASE_URL is invalid")
  }
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]"
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) {
    throw new QuantAgentReadError("configuration_error", "QuantAgent API must use HTTPS or loopback HTTP without URL credentials")
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`
  return url
}

function endpoint(base: URL, runId: string, report = false): URL {
  const path = `api/v1/runs/${encodeURIComponent(runId)}${report ? "/report" : ""}`
  return new URL(path, base)
}

async function readBounded(response: Response, limit: number): Promise<string> {
  return decodeUtf8(await readBoundedBytes(response, limit))
}

async function readBoundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length")
  const declared = contentLength === null ? null : Number(contentLength)
  if (declared !== null && Number.isFinite(declared) && declared > limit) {
    await response.body?.cancel().catch(() => undefined)
    throw new QuantAgentReadError("invalid_response", "QuantAgent response is too large")
  }
  if (!response.body) return new Uint8Array()

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) {
        await reader.cancel().catch(() => undefined)
        throw new QuantAgentReadError("invalid_response", "QuantAgent response is too large")
      }
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof QuantAgentReadError) throw error
    throw new QuantAgentReadError("invalid_response", "QuantAgent response could not be read")
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new QuantAgentReadError("invalid_response", "QuantAgent response is not valid UTF-8")
  }
}

async function digestSha256(bytes: Uint8Array): Promise<string> {
  const input = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(input).set(bytes)
  const digest = await crypto.subtle.digest("SHA-256", input)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function reportEtag(response: Response): string {
  const match = response.headers.get("etag")?.match(/^"([a-f0-9]{64})"$/)
  if (!match) {
    throw new QuantAgentReadError("artifact_integrity_error", "QuantAgent report is missing a valid integrity ETag")
  }
  return match[1]
}

async function failure(response: Response): Promise<QuantAgentReadError> {
  let code: QuantAgentReadErrorCode = "upstream_unavailable"
  try {
    const body = JSON.parse(await readBounded(response, 64 * 1024)) as { error?: { code?: string } }
    const upstreamCode = body?.error?.code
    if (upstreamCode === "authentication_required" || upstreamCode === "access_denied" || upstreamCode === "run_not_found" || upstreamCode === "result_unavailable" || upstreamCode === "artifact_integrity_error") {
      code = upstreamCode
    }
  } catch {
    // Public failures are intentionally normalized below.
  }
  return new QuantAgentReadError(code, `QuantAgent request failed with ${response.status}`, response.status)
}

async function request(
  url: URL,
  token: string,
  accept: string,
  fetchImpl: typeof fetch,
): Promise<Response> {
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: accept },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw await failure(response)
    return response
  } catch (error) {
    if (error instanceof QuantAgentReadError) throw error
    throw new QuantAgentReadError("upstream_unavailable", "QuantAgent API is unavailable")
  }
}

export async function loadQuantAgentRun(
  runId: string,
  config: QuantAgentReadConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<QuantAgentRunResult> {
  if (!RUN_ID.test(runId)) throw new QuantAgentReadError("invalid_run_id", "Run ID is invalid")
  if (!config.bearerToken || config.bearerToken.length < 32 || !config.bearerToken.trim()) {
    throw new QuantAgentReadError("configuration_error", "QUANTAGENT_API_BEARER_TOKEN must contain at least 32 characters")
  }
  const base = normalizeQuantAgentBaseUrl(config.baseUrl)
  const [summaryResult, reportResult] = await Promise.allSettled([
    request(endpoint(base, runId), config.bearerToken, "application/json", fetchImpl),
    request(endpoint(base, runId, true), config.bearerToken, "text/markdown", fetchImpl),
  ])
  if (summaryResult.status === "rejected") throw summaryResult.reason
  const summaryText = await readBounded(summaryResult.value, MAX_SUMMARY_LENGTH)
  let summaryValue: unknown
  try {
    summaryValue = JSON.parse(summaryText)
  } catch {
    throw new QuantAgentReadError("invalid_response", "QuantAgent returned invalid JSON")
  }
  const summary = parseRunSummary(summaryValue)
  if (summary.run_id !== runId) {
    throw new QuantAgentReadError("invalid_response", "QuantAgent returned a mismatched run summary")
  }
  if (!summary.links.report) return { summary, report: null, rawReport: null }
  if (reportResult.status === "rejected") throw reportResult.reason
  const finalStep = summary.steps.at(-1)
  if (
    !summary.final
    || summary.final.contract !== "quantagent.report.v1"
    || finalStep?.output_contract !== summary.final.contract
    || finalStep.output_sha256 !== summary.final.content_sha256
  ) {
    throw new QuantAgentReadError("artifact_integrity_error", "QuantAgent report metadata is inconsistent")
  }
  const reportBytes = await readBoundedBytes(reportResult.value, MAX_REPORT_LENGTH)
  if (await digestSha256(reportBytes) !== reportEtag(reportResult.value)) {
    throw new QuantAgentReadError("artifact_integrity_error", "QuantAgent report failed integrity validation")
  }
  const rawReport = decodeUtf8(reportBytes)
  try {
    return { summary, report: parseThesisReport(rawReport), rawReport }
  } catch {
    throw new QuantAgentReadError("invalid_response", "QuantAgent returned an unsupported Markdown report")
  }
}
