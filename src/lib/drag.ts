import type { Card, Column, Transition } from "./jira"

export type DropPending = {
  key: string
  to: string
  matches: Transition[] | null
  error: string | null
}

export function matchesAfterDrop(
  from: string,
  to: string,
  transitions: Transition[],
  destStatusIds: string[],
): "noop" | Transition[] {
  if (from === to) return "noop"
  const ids = new Set(destStatusIds)
  return transitions.filter((item) => ids.has(item.to.id))
}

export function pendingFromDrop(
  key: string,
  from: string,
  destName: string,
  destStatusIds: string[],
  got: Transition[] | string,
): DropPending | null {
  if (typeof got === "string") {
    return { key, to: destName, matches: [], error: got }
  }
  const intent = matchesAfterDrop(from, destName, got, destStatusIds)
  if (intent === "noop") return null
  return { key, to: destName, matches: intent, error: null }
}

export function preview(
  columns: Column[],
  pending: DropPending | null,
): Column[] {
  if (!pending) return columns
  if (pending.matches !== null && pending.matches.length === 0) return columns
  let card: Card | undefined
  for (const column of columns) {
    card = column.cards.find((item) => item.key === pending.key)
    if (card) break
  }
  if (!card) return columns
  return columns.map((column) => {
    const cards = column.cards.filter((item) => item.key !== pending.key)
    if (column.name === pending.to) return { ...column, cards: [...cards, card] }
    return { ...column, cards }
  })
}
