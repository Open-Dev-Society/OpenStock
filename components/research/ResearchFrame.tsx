import type { ReactNode } from "react"

import { RunLocator } from "@/components/research/RunLocator"

export function ResearchFrame({
  runId,
  children,
}: {
  runId?: string
  children: ReactNode
}) {
  return (
    <section className="research-page">
      <header className="research-page-heading">
        <h1>Research</h1>
        <p>Review an existing QuantAgent run without starting a new task.</p>
      </header>
      <RunLocator defaultRunId={runId} />
      {children}
    </section>
  )
}
