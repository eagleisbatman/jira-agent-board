export type DragTransition = {
  id: string
  name: string
  to: { id: string }
}

export function matchesAfterDrop(
  from: string,
  to: string,
  transitions: DragTransition[],
  destStatusIds: string[],
): "noop" | DragTransition[] {
  if (from === to) return "noop"
  const ids = new Set(destStatusIds)
  return transitions.filter((item) => ids.has(item.to.id))
}
