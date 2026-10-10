import {
  Check,
  CheckCircle2,
  CircleDot,
  FileText,
  Fingerprint,
  GitCompareArrows,
  ShieldAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { QuantAgentRunResult } from "@/lib/quantagent/types"

function pretty(value: string): string {
  return value.replace(/^research_only_/, "").replaceAll("_", " ")
}

function time(value: string | null): string {
  if (!value) return "In progress"
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC"
}

function tone(value: string): string {
  const normalized = value.toLowerCase()
  if (["supported", "support", "strengthen", "completed", "intact"].includes(normalized)) return "positive"
  if (["challenged", "oppose", "weaken", "weakened", "triggered", "failed"].includes(normalized)) return "negative"
  if (["context", "monitoring", "reassess", "running"].includes(normalized)) return "warning"
  return "neutral"
}

function StatusBadge({ value }: { value: string }) {
  return <Badge variant="outline" data-tone={tone(value)} className="research-status-badge">{pretty(value)}</Badge>
}

function Hash({ value }: { value: string }) {
  return <code className="research-hash" title={value}>{value.slice(0, 10)}…</code>
}

function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="research-panel">
      <div className="research-panel-title">{icon}{title}</div>
      {children}
    </section>
  )
}

const STEP_LABELS: Record<string, string> = {
  "source.thesis_review": "Load thesis review",
  "research.thesis_update": "Update thesis state",
  "report.thesis": "Write thesis report",
}

const STEP_ROLES: Record<string, string> = {
  "source.thesis_review": "Reader",
  "research.thesis_update": "Analyst",
  "report.thesis": "Writer",
}

export function ResearchResult({ result }: { result: QuantAgentRunResult }) {
  const { summary, report, rawReport } = result
  if (!report || !rawReport) {
    return (
      <Panel title="Run status" icon={<CircleDot aria-hidden="true" />}>
        <div className="research-pending">
          <StatusBadge value={summary.status} />
          <p>This run has no completed Markdown report yet. Refreshing this page only repeats the read.</p>
        </div>
      </Panel>
    )
  }

  return (
    <div className="research-result-grid">
      <div className="research-primary-column">
        <section className="research-subject-panel">
          <div className="research-subject-mark"><Fingerprint aria-hidden="true" /></div>
          <div className="research-subject-name">
            <p>Thesis</p>
            <h2>{report.thesisId}</h2>
            <span>Version {report.version} · as of {time(report.asOf)}</span>
          </div>
          <div className="research-summary-stat">
            <span>Assessment</span>
            <StatusBadge value={report.assessment} />
          </div>
          <div className="research-summary-stat">
            <span>Research suggestion</span>
            <StatusBadge value={report.researchSuggestion} />
          </div>
          <div className="research-summary-stat">
            <span>Completed</span>
            <strong>{time(summary.completed_at)}</strong>
          </div>
        </section>

        <Panel title="Current thesis">
          <p className="research-thesis-copy">{report.coreThesis}</p>
        </Panel>

        <Panel title="Revision" icon={<GitCompareArrows aria-hidden="true" />}>
          <div className="research-revision">
            <div>
              <span>Current assessment</span>
              <StatusBadge value={report.assessment} />
            </div>
            <div>
              <span>Reason codes</span>
              <p>{report.revision.reasons.map(pretty).join(", ") || "None declared"}</p>
            </div>
            <div>
              <span>Added evidence</span>
              <p>{report.revision.addedEvidence.join(", ") || "None"}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Claim scorecard">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Claim</TableHead><TableHead>Current stance</TableHead><TableHead>Evidence</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {report.claims.map((claim) => (
                <TableRow key={claim.claim}>
                  <TableCell className="min-w-72 text-gray-300">{claim.claim}</TableCell>
                  <TableCell><StatusBadge value={claim.status} /></TableCell>
                  <TableCell>{claim.evidence.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Evidence">
          <p className="research-panel-note">Raw excerpts remain untrusted in QuantAgent and are not rendered here.</p>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Source</TableHead><TableHead>Stance</TableHead><TableHead>Impact</TableHead><TableHead>Claims</TableHead><TableHead>Content hash</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {report.evidence.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="min-w-64"><strong className="block text-gray-300">{item.source}</strong><span className="text-xs text-gray-500">{item.id}</span></TableCell>
                  <TableCell><StatusBadge value={item.stance} /></TableCell>
                  <TableCell><StatusBadge value={item.impact} /></TableCell>
                  <TableCell>{item.claims.length}</TableCell>
                  <TableCell><Hash value={item.contentSha256} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Invalidation conditions" icon={<ShieldAlert aria-hidden="true" />}>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Condition</TableHead><TableHead>Status</TableHead><TableHead>Evidence</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {report.invalidationConditions.map((item) => (
                <TableRow key={item.condition}>
                  <TableCell className="min-w-72 text-gray-300">{item.condition}</TableCell>
                  <TableCell><StatusBadge value={item.status} /></TableCell>
                  <TableCell>{item.evidence.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>

      <aside className="research-secondary-column">
        <Panel title="Run status">
          <div className="research-run-heading">
            <CheckCircle2 aria-hidden="true" />
            <div><h3>{pretty(summary.status)}</h3><p>{summary.offline ? "Offline" : "Online"} · {summary.steps.filter((step) => step.status === "completed").length} of {summary.steps.length} steps</p></div>
          </div>
          <ol className="research-steps">
            {summary.steps.map((step) => (
              <li key={step.id}>
                <span className="research-step-mark"><Check aria-hidden="true" /></span>
                <div><strong>{STEP_LABELS[step.capability] ?? step.id}</strong><span>{STEP_ROLES[step.capability] ?? step.capability}</span></div>
                <StatusBadge value={step.status} />
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Provenance">
          <dl className="research-provenance">
            <div><dt>Run ID</dt><dd>{summary.run_id}</dd></div>
            <div><dt>Agent</dt><dd>{summary.selection ? `${summary.selection.agent.id}@${summary.selection.agent.version}` : "Direct recipe"}</dd></div>
            <div><dt>Skill</dt><dd>{summary.selection ? `${summary.selection.skill.id}@${summary.selection.skill.version}` : "—"}</dd></div>
            <div><dt>Recipe</dt><dd>{summary.recipe.id}@{summary.recipe.version}</dd></div>
            <div className="research-provenance-rule"><dt>Final contract</dt><dd>{summary.final?.contract ?? "—"}</dd></div>
            <div><dt>Contract hash</dt><dd>{summary.final ? <Hash value={summary.final.content_sha256} /> : "—"}</dd></div>
            <div><dt>Previous state</dt><dd><Hash value={report.revision.previousStateSha256} /></dd></div>
            <div><dt>Evidence bundle</dt><dd><Hash value={report.revision.evidenceBundleSha256} /></dd></div>
          </dl>
        </Panel>

        {report.missingInformation.length > 0 && (
          <Panel title="Missing information">
            <ul className="research-missing">
              {report.missingInformation.map((item) => <li key={item}>{pretty(item)}</li>)}
            </ul>
          </Panel>
        )}

        <details className="research-report-details">
          <summary><FileText aria-hidden="true" />View full Markdown report</summary>
          <pre>{rawReport}</pre>
        </details>

        <p className="research-scope">{report.scope}</p>
      </aside>
    </div>
  )
}
