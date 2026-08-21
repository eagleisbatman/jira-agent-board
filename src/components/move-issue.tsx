"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Transition = { id: string; name: string }

export function MoveIssue({ issueKey }: { issueKey: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [transitions, setTransitions] = useState<Transition[] | null>(null)
  const [picked, setPicked] = useState<Transition | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    setPicked(null)
    setTransitions(null)
    const res = await fetch(`/api/issues/${encodeURIComponent(issueKey)}/transitions`)
    const data = (await res.json()) as {
      transitions?: Transition[]
      error?: { message?: string }
    }
    if (!res.ok) {
      setError(data.error?.message ?? "Could not load statuses.")
      setTransitions([])
      return
    }
    setTransitions(data.transitions ?? [])
  }

  async function move() {
    if (!picked) return
    setPending(true)
    setError(null)
    const res = await fetch(`/api/issues/${encodeURIComponent(issueKey)}/transitions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transitionId: picked.id, confirm: true }),
    })
    const data = (await res.json()) as { error?: { message?: string } }
    setPending(false)
    if (!res.ok) {
      setError(data.error?.message ?? "Could not save this issue.")
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) void load()
        if (!next) {
          setTransitions(null)
          setPicked(null)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Move
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {picked ? `Move ${issueKey} to ${picked.name}?` : `Move ${issueKey}`}
          </DialogTitle>
          {picked ? null : <DialogDescription>Pick a status.</DialogDescription>}
        </DialogHeader>
        {transitions === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : picked ? null : (
          <div className="flex flex-col gap-1">
            {transitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No statuses to move to.</p>
            ) : (
              transitions.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className="justify-start"
                  onClick={() => setPicked(item)}
                >
                  {item.name}
                </Button>
              ))
            )}
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {picked ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPicked(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void move()} disabled={pending}>
              {pending ? "Moving…" : "Confirm"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
