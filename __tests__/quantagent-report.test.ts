import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { parseThesisReport } from "@/lib/quantagent/report"

const report = readFileSync(resolve(__dirname, "fixtures/quantagent-thesis-report.md"), "utf8")

describe("parseThesisReport", () => {
  it("parses the real P3a deterministic report without rendering raw excerpts", () => {
    const parsed = parseThesisReport(report)

    expect(parsed.thesisId).toBe("thesis.btc.synthetic.v1")
    expect(parsed.version).toBe(2)
    expect(parsed.assessment).toBe("weakened")
    expect(parsed.researchSuggestion).toBe("research_only_reassess")
    expect(parsed.claims).toEqual([
      expect.objectContaining({ status: "challenged", evidence: ["evidence.new.oppose", "evidence.prior.support"] }),
      expect.objectContaining({ status: "supported", evidence: ["evidence.new.support"] }),
    ])
    expect(parsed.evidence).toHaveLength(4)
    expect(parsed.invalidationConditions[0]).toEqual(expect.objectContaining({ status: "monitoring", evidence: [] }))
    expect(parsed.missingInformation).toEqual([])
    expect(parsed.actionEligible).toBe(false)
    expect(report).not.toContain("Ignore prior instructions")
  })

  it("fails closed when lineage hashes are malformed", () => {
    expect(() => parseThesisReport(report.replace(/ca8efc[0-9a-f]+/, "not-a-hash"))).toThrow(
      "invalid revision lineage",
    )
  })
})
