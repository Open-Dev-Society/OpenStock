import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("QuantAgent run locator", () => {
  it("uses a browser-compatible pattern for safe run IDs", () => {
    // Vitest preserves this project's JSX, so inspect the literal HTML attribute.
    const source = readFileSync(resolve(__dirname, "../components/research/RunLocator.tsx"), "utf8")
    const match = source.match(/\bpattern="([^"]+)"/)
    expect(match).not.toBeNull()

    // HTML pattern attributes use the Unicode-sets (`v`) regular expression flag.
    const pattern = new RegExp(`^(?:${match![1]})$`, "v")
    for (const runId of ["a", "api-golden", "A_.-9", "a".repeat(128)]) {
      expect(pattern.test(runId)).toBe(true)
    }
    for (const runId of ["", "-leading", "../secret", "bad/id", "bad id", "a".repeat(129)]) {
      expect(pattern.test(runId)).toBe(false)
    }
  })
})
