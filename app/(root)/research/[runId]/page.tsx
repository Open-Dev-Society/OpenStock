import { ResearchErrorState } from "@/components/research/ResearchErrorState"
import { ResearchFrame } from "@/components/research/ResearchFrame"
import { ResearchResult } from "@/components/research/ResearchResult"
import { QuantAgentReadError } from "@/lib/quantagent/read-api"
import { getQuantAgentRun, QuantAgentAccountAccessError } from "@/lib/quantagent/server"

export const dynamic = "force-dynamic"

export default async function ResearchRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  try {
    const result = await getQuantAgentRun(runId)
    return <ResearchFrame runId={runId}><ResearchResult result={result} /></ResearchFrame>
  } catch (error) {
    const code = error instanceof QuantAgentReadError ? error.code : "upstream_unavailable"
    return <ResearchFrame runId={runId} showLocator={!(error instanceof QuantAgentAccountAccessError)}><ResearchErrorState code={code} /></ResearchFrame>
  }
}
