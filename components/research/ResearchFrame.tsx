import type { ReactNode } from "react"

import { RunLocator } from "@/components/research/RunLocator"

export function ResearchFrame({
  runId,
  showLocator = true,
  children,
}: {
  runId?: string
  showLocator?: boolean
  children: ReactNode
}) {
  return (
    <section className="research-page">
      <header className="research-page-heading">
        <h1>Research</h1>
        <p>Review an existing QuantAgent run without starting a new task.</p>
      </header>
      {showLocator && <RunLocator defaultRunId={runId} />}
      {children}
    </section>
  )
}
