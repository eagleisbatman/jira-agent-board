import { createIssue, transitionIssue, type WriteFail } from "./jira"
import type { Settings } from "./settings"

export type Proposal =
  | { id: string; kind: "create"; payload: { summary: string } }
  | { id: string; kind: "transition"; payload: { key: string; transitionId: string; name: string } }

const store = new Map<string, Proposal>()
let seq = 0

function nextId() {
  seq += 1
  return `p${seq}`
}

export function proposeCreate(summary: string): Proposal {
  const proposal: Proposal = {
    id: nextId(),
    kind: "create",
    payload: { summary: summary.trim() },
  }
  store.set(proposal.id, proposal)
  return proposal
}

export function proposeTransition(
  key: string,
  transitionId: string,
  name: string,
): Proposal {
  const proposal: Proposal = {
    id: nextId(),
    kind: "transition",
    payload: { key, transitionId, name },
  }
  store.set(proposal.id, proposal)
  return proposal
}

export async function confirmProposal(
  id: string,
  confirm: boolean,
  settings: Settings,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: true; key?: string } | WriteFail> {
  const proposal = store.get(id)
  if (!proposal) {
    return {
      ok: false,
      status: 404,
      message: "That proposal expired. Ask again.",
    }
  }
  store.delete(id)
  if (!confirm) {
    return { ok: false, status: 400, message: "Confirm required." }
  }
  if (proposal.kind === "create") {
    return createIssue(settings, proposal.payload.summary, fetchFn)
  }
  return transitionIssue(
    settings,
    proposal.payload.key,
    proposal.payload.transitionId,
    fetchFn,
  )
}
