import { ExternalLink, LockKeyhole } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function RunLocator({ defaultRunId = "" }: { defaultRunId?: string }) {
  return (
    <form action="/research" method="get" className="research-locator">
      <label htmlFor="runId" className="research-locator-label">Run ID</label>
      <Input
        id="runId"
        name="runId"
        defaultValue={defaultRunId}
        required
        pattern="[A-Za-z0-9](?:[A-Za-z0-9._]|-){0,127}"
        maxLength={128}
        autoComplete="off"
        spellCheck={false}
        placeholder="api-golden"
        className="research-locator-input"
      />
      <Button type="submit" variant="ghost" className="research-open-button">
        <ExternalLink aria-hidden="true" />
        Open result
      </Button>
      <span className="research-readonly-badge">
        <LockKeyhole aria-hidden="true" />
        Read only
      </span>
    </form>
  )
}
