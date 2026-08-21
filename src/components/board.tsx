"use client"

import { useState } from "react"

import { MoveIssue } from "@/components/move-issue"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { pendingFromDrop, preview, type DropPending } from "@/lib/drag"
import type { Card as IssueCard, Column, Transition } from "@/lib/jira"

export function Board({ columns }: { columns: Column[] }) {
  const [pending, setPending] = useState<DropPending | null>(null)
  const shown = preview(columns, pending)
  const matches = pending?.matches
  const seed =
    pending && matches
      ? matches.length === 0
        ? { transitions: [], error: pending.error ?? undefined }
        : matches.length === 1
          ? { transitions: [matches[0]], picked: matches[0] }
          : { transitions: matches }
      : null

  async function onDrop(dest: Column, raw: string) {
    let payload: { key: string; from: string }
    try {
      payload = JSON.parse(raw) as { key: string; from: string }
    } catch {
      return
    }
    if (payload.from === dest.name) return
    setPending({
      key: payload.key,
      to: dest.name,
      matches: null,
      error: null,
    })
    try {
      const res = await fetch(
        `/api/issues/${encodeURIComponent(payload.key)}/transitions`,
      )
      const data = (await res.json()) as {
        transitions?: Transition[]
        error?: { message?: string }
      }
      setPending(
        pendingFromDrop(
          payload.key,
          payload.from,
          dest.name,
          dest.statusIds,
          res.ok
            ? (data.transitions ?? [])
            : (data.error?.message ?? "Could not reach Jira."),
        ),
      )
    } catch {
      setPending(
        pendingFromDrop(
          payload.key,
          payload.from,
          dest.name,
          dest.statusIds,
          "Could not reach Jira.",
        ),
      )
    }
  }

  return (
    <div className="flex flex-1 gap-3 overflow-x-auto">
      {shown.map((column) => (
        <section
          key={column.name}
          className="w-72 shrink-0 space-y-2"
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
          }}
          onDrop={(event) => {
            event.preventDefault()
            void onDrop(column, event.dataTransfer.getData("text/plain"))
          }}
        >
          <h2 className="text-sm font-medium">
            {column.name}{" "}
            <span className="text-muted-foreground">{column.cards.length}</span>
          </h2>
          {column.cards.map((card) => (
            <IssueCardView
              key={card.key}
              card={card}
              column={column.name}
              dragging={pending?.key === card.key}
            />
          ))}
        </section>
      ))}
      {pending && seed ? (
        <MoveIssue
          issueKey={pending.key}
          seed={seed}
          onClosed={() => setPending(null)}
        />
      ) : null}
    </div>
  )
}

function IssueCardView({
  card,
  column,
  dragging,
}: {
  card: IssueCard
  column: string
  dragging: boolean
}) {
  return (
    <Card
      size="sm"
      draggable
      className={dragging ? "opacity-70" : undefined}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ key: card.key, from: column }),
        )
        event.dataTransfer.effectAllowed = "move"
      }}
    >
      <CardHeader>
        <CardDescription>{card.key}</CardDescription>
        <CardTitle>{card.summary}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{card.assignee ?? "Unassigned"}</span>
        <MoveIssue issueKey={card.key} />
      </CardContent>
    </Card>
  )
}

