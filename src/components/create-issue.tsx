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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateIssue() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  function reset() {
    setSummary("")
    setConfirming(false)
    setPending(false)
    setError(null)
    setFieldError(null)
  }

  async function create() {
    setPending(true)
    setError(null)
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ summary, confirm: true }),
    })
    const data = (await res.json()) as {
      key?: string
      errors?: { summary?: string }
      error?: { message?: string } | string
    }
    setPending(false)
    if (data.errors?.summary) {
      setConfirming(false)
      setFieldError(data.errors.summary)
      return
    }
    if (!res.ok) {
      const message =
        typeof data.error === "string"
          ? data.error
          : data.error?.message ?? "Could not save this issue."
      setError(message)
      return
    }
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          Create
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirming ? "Create this Task?" : "Create"}</DialogTitle>
          {confirming ? <DialogDescription>{summary}</DialogDescription> : null}
        </DialogHeader>
        {confirming ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(event) => {
                setSummary(event.target.value)
                setFieldError(null)
              }}
            />
            {fieldError ? (
              <p className="text-sm text-destructive">{fieldError}</p>
            ) : null}
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          {confirming ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void create()} disabled={pending}>
                {pending ? "Creating…" : "Confirm"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={summary.trim() === ""}
              onClick={() => setConfirming(true)}
            >
              Create Task
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
