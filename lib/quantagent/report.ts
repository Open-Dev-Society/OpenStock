import type {
  ParsedThesisReport,
  ReportClaim,
  ReportEvidence,
  ReportInvalidation,
} from "@/lib/quantagent/types"

const MAX_REPORT_LENGTH = 4 * 1024 * 1024

function decode(value: string): string {
  let result = value.trim()
  const boldContent = result.startsWith("**") && result.endsWith("**") ? result.slice(2, -2) : null
  const codeContent = result.startsWith("`") && result.endsWith("`") ? result.slice(1, -1) : null
  if (boldContent !== null && !boldContent.includes("**")) result = boldContent
  else if (codeContent !== null && !codeContent.includes("`")) result = codeContent
  return result
    .replace(/\\([\\`|*\[\]()#!])/g, "$1")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
}

function splitMarkdownRow(line: string): string[] {
  const cells: string[] = []
  let cell = ""
  let escaped = false
  for (const character of line.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (escaped) {
      cell += `\\${character}`
      escaped = false
    } else if (character === "\\") {
      escaped = true
    } else if (character === "|") {
      cells.push(decode(cell))
      cell = ""
    } else {
      cell += character
    }
  }
  if (escaped) cell += "\\"
  cells.push(decode(cell))
  return cells
}

function parseCsv(value: string): string[] {
  const trimmed = value.trim()
  return trimmed === "—" || trimmed.toLowerCase() === "none"
    ? []
    : trimmed.split(",").map((item) => decode(item)).filter(Boolean)
}

function sectionMap(markdown: string): { metadata: string[]; sections: Map<string, string[]> } {
  const metadata: string[] = []
  const sections = new Map<string, string[]>()
  let current: string | null = null
  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    if (rawLine.startsWith("## ")) {
      current = rawLine.slice(3).trim()
      sections.set(current, [])
    } else if (current) {
      sections.get(current)!.push(rawLine)
    } else {
      metadata.push(rawLine)
    }
  }
  return { metadata, sections }
}

function metadataValue(lines: string[], label: string): string {
  const prefix = `- ${label}:`
  const line = lines.find((item) => item.startsWith(prefix))
  if (!line) throw new Error(`QuantAgent report is missing ${label}`)
  return decode(line.slice(prefix.length))
}

function sectionText(sections: Map<string, string[]>, name: string): string {
  const lines = sections.get(name)
  if (!lines) throw new Error(`QuantAgent report is missing ${name}`)
  return decode(lines.filter((line) => line.trim()).join(" "))
}

function tableRows(sections: Map<string, string[]>, name: string): string[][] {
  const lines = sections.get(name)
  if (!lines) throw new Error(`QuantAgent report is missing ${name}`)
  return lines
    .filter((line) => line.trim().startsWith("|"))
    .slice(2)
    .map(splitMarkdownRow)
}

function parseBoolean(value: string, label: string): boolean {
  if (value === "true") return true
  if (value === "false") return false
  throw new Error(`QuantAgent report has an invalid ${label}`)
}

export function parseThesisReport(markdown: string): ParsedThesisReport {
  if (!markdown || markdown.length > MAX_REPORT_LENGTH) {
    throw new Error("QuantAgent report is empty or too large")
  }
  const { metadata, sections } = sectionMap(markdown)
  const titleLine = metadata.find((line) => line.startsWith("# "))
  if (!titleLine) throw new Error("QuantAgent report is missing a title")

  const thesis = metadataValue(metadata, "Thesis")
  const thesisMatch = thesis.match(/^`?([^`]+)`?\s+v(\d+)$/)
  if (!thesisMatch) throw new Error("QuantAgent report has an invalid thesis reference")

  const claims: ReportClaim[] = tableRows(sections, "Claim scorecard").map((cells) => {
    if (cells.length !== 3) throw new Error("QuantAgent claim table is invalid")
    return { claim: cells[0], status: cells[1], evidence: parseCsv(cells[2]) }
  })
  const evidence: ReportEvidence[] = tableRows(sections, "Evidence index").map((cells) => {
    if (cells.length !== 6 || !/^[a-f0-9]{64}$/.test(cells[5])) {
      throw new Error("QuantAgent evidence table is invalid")
    }
    return {
      id: cells[0],
      stance: cells[1],
      impact: cells[2],
      source: cells[3],
      claims: parseCsv(cells[4]),
      contentSha256: cells[5],
    }
  })
  const invalidationConditions: ReportInvalidation[] = tableRows(sections, "Invalidation conditions").map((cells) => {
    if (cells.length !== 3) throw new Error("QuantAgent invalidation table is invalid")
    return { condition: cells[0], status: cells[1], evidence: parseCsv(cells[2]) }
  })

  const missingInformation = (sections.get("Missing information") ?? [])
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => decode(line.trim().slice(2)))
    .filter((item) => item !== "None declared by the deterministic checks.")

  const revisionLines = sections.get("Revision") ?? []
  const revision = (label: string) => metadataValue(revisionLines, label)
  const previousStateSha256 = revision("Previous state SHA-256")
  const evidenceBundleSha256 = revision("Evidence bundle SHA-256")
  if (!/^[a-f0-9]{64}$/.test(previousStateSha256) || !/^[a-f0-9]{64}$/.test(evidenceBundleSha256)) {
    throw new Error("QuantAgent report has invalid revision lineage")
  }

  return {
    title: decode(titleLine.slice(2)),
    thesisId: thesisMatch[1],
    version: Number(thesisMatch[2]),
    asOf: metadataValue(metadata, "As of"),
    assessment: metadataValue(metadata, "Assessment"),
    researchSuggestion: metadataValue(metadata, "Research suggestion"),
    evidenceSufficient: parseBoolean(metadataValue(metadata, "Evidence sufficient"), "evidence flag"),
    humanReviewed: parseBoolean(metadataValue(metadata, "Human reviewed"), "review flag"),
    actionEligible: parseBoolean(metadataValue(metadata, "Action eligible"), "action flag"),
    coreThesis: sectionText(sections, "Core thesis"),
    claims,
    evidence,
    invalidationConditions,
    missingInformation,
    revision: {
      addedEvidence: parseCsv(revision("Added evidence")),
      reasons: parseCsv(revision("Reasons")),
      previousStateSha256,
      evidenceBundleSha256,
    },
    scope: sectionText(sections, "Scope"),
  }
}
