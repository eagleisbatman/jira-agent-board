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

export function MoveIssue({
  issueKey,
  seed,
  onClosed,
}: {
  issueKey: string
  seed?: { transitions: Transition[]; picked?: Transition | null; error?: string }
  onClosed?: () => void
}) {
  const router = useRouter()
  const seeded = seed !== undefined
  const [open, setOpen] = useState(seeded)
  const [transitions, setTransitions] = useState<Transition[] | null>(
    seed?.transitions ?? null,
  )
  const [picked, setPicked] = useState<Transition | null>(seed?.picked ?? null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(seed?.error ?? null)

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
    onClosed?.()
    router.refresh()
  }

  function close(next: boolean) {
    setOpen(next)
    if (next && !seeded) void load()
    if (!next) {
      if (!seeded) {
        setTransitions(null)
        setPicked(null)
        setError(null)
      }
      onClosed?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      {seeded ? null : (
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="sm">
            Move
          </Button>
        </DialogTrigger>
      )}
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
              error ? null : (
                <p className="text-sm text-muted-foreground">No moves available.</p>
              )
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
              onClick={() => {
                if (seeded) {
                  setOpen(false)
                  onClosed?.()
                  return
                }
                setPicked(null)
              }}
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
