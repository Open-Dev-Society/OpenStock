import { redirect } from "next/navigation"

import { ResearchEmptyState } from "@/components/research/ResearchEmptyState"
import { ResearchErrorState } from "@/components/research/ResearchErrorState"
import { ResearchFrame } from "@/components/research/ResearchFrame"
import { canAccessQuantAgentResearch } from "@/lib/quantagent/server"

export const dynamic = "force-dynamic"

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string | string[] }>
}) {
  if (!(await canAccessQuantAgentResearch())) {
    return <ResearchFrame showLocator={false}><ResearchErrorState code="access_denied" /></ResearchFrame>
  }

  const value = (await searchParams).runId
  if (typeof value === "string" && value) redirect(`/research/${encodeURIComponent(value)}`)

  return (
    <ResearchFrame>
      <ResearchEmptyState />
    </ResearchFrame>
  )
}
