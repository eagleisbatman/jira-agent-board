import type { Transition } from "./jira"

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
