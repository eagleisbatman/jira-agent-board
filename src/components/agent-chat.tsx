"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type Line = { role: "user" | "assistant"; content: string }

type Proposal =
  | { id: string; kind: "create"; payload: { summary: string } }
  | {
      id: string
      kind: "transition"
      payload: { key: string; transitionId: string; name: string }
    }

export function AgentChat({ projectKey }: { projectKey: string }) {
  const router = useRouter()
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const proposalRef = useRef<Proposal | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const content = draft.trim()
    if (!content || sending) return
    const next: Line[] = [...lines, { role: "user", content }]
    setLines([...next, { role: "assistant", content: "Thinking…" }])
    setDraft("")
    setSending(true)
    setError(null)
    const res = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: next }),
    })
    const data = (await res.json()) as {
      reply?: string
      proposal?: Proposal
      error?: string
    }
    setSending(false)
    if (!res.ok) {
      const message = data.error ?? "Could not reach the agent."
      setLines([...next, { role: "assistant", content: message }])
      return
    }
    setLines([...next, { role: "assistant", content: data.reply ?? "" }])
    if (data.proposal) {
      proposalRef.current = data.proposal
      setProposal(data.proposal)
      return
    }
    router.refresh()
  }

  async function confirm(yes: boolean) {
    const current = proposalRef.current
    if (!current) return
    proposalRef.current = null
    setProposal(null)
    setError(null)
    const res = await fetch("/api/agent/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proposalId: current.id, confirm: yes }),
    })
    if (!yes) {
      setLines((now) => [...now, { role: "assistant", content: "Cancelled." }])
      return
    }
    if (res.status !== 204 && res.status !== 201) {
      const data = (await res.json()) as { error?: string }
      const message = data.error ?? "Could not save this issue."
      setError(message)
      if (res.status === 404) {
        setLines((now) => [...now, { role: "assistant", content: message }])
      }
      return
    }
    router.refresh()
  }

  return (
    <div className="mt-auto space-y-2 border-t pt-3">
      <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
        {lines.map((line, index) => (
          <p key={index} className={line.role === "user" ? "font-medium" : "text-muted-foreground"}>
            {line.content}
          </p>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Create, move, or label an issue."
          disabled={sending}
        />
        <Button type="submit" size="sm" disabled={sending || draft.trim() === ""}>
          Send
        </Button>
      </form>
      {error === "Token rejected." ? (
        <p className="text-sm text-destructive">
          Token rejected.{" "}
          <Link href="/settings" className="underline">
            Open settings
          </Link>
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <Dialog
        open={proposal !== null}
        onOpenChange={(open) => {
          if (!open) void confirm(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {proposal?.kind === "transition"
                ? `Move ${proposal.payload.key} to ${proposal.payload.name}?`
                : "Create this issue?"}
            </DialogTitle>
            {proposal?.kind === "create" ? (
              <DialogDescription>
                {proposal.payload.summary} as Task in {projectKey}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void confirm(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void confirm(true)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
