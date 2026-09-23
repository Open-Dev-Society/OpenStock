import { redirect } from "next/navigation"

import { ResearchEmptyState } from "@/components/research/ResearchEmptyState"
import { ResearchFrame } from "@/components/research/ResearchFrame"

export const dynamic = "force-dynamic"

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ runId?: string | string[] }>
}) {
  const value = (await searchParams).runId
  if (typeof value === "string" && value) redirect(`/research/${encodeURIComponent(value)}`)

  return (
    <ResearchFrame>
      <ResearchEmptyState />
    </ResearchFrame>
  )
}
