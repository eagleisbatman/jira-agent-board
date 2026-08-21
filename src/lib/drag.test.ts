import { describe, expect, test } from "bun:test"

import { matchesAfterDrop, pendingFromDrop, preview } from "./drag"
import type { Column } from "./jira"

const transitions = [
  { id: "21", name: "In Progress", to: { id: "2" } },
  { id: "31", name: "Done", to: { id: "3" } },
  { id: "41", name: "Review", to: { id: "4" } },
]

const columns: Column[] = [
  {
    name: "To Do",
    statusIds: ["1"],
    cards: [{ key: "ABC-1", summary: "First", assignee: null }],
  },
  { name: "Done", statusIds: ["3", "4"], cards: [] },
]

describe("matchesAfterDrop", () => {
  test("same column is a no-op", () => {
    expect(
      matchesAfterDrop("Done", "Done", transitions, ["3", "4"]),
    ).toBe("noop")
  })

  test("0 matching to.id snaps with empty list", () => {
    expect(matchesAfterDrop("To Do", "Done", transitions, ["9"])).toEqual([])
  })

  test("1 matching to.id", () => {
    expect(matchesAfterDrop("To Do", "Done", transitions, ["3"])).toEqual([
      { id: "31", name: "Done", to: { id: "3" } },
    ])
  })

  test("2+ matching to.id", () => {
    expect(
      matchesAfterDrop("To Do", "Done", transitions, ["3", "4"]),
    ).toEqual([
      { id: "31", name: "Done", to: { id: "3" } },
      { id: "41", name: "Review", to: { id: "4" } },
    ])
  })

  test("does not match by transition name", () => {
    expect(
      matchesAfterDrop("To Do", "Done", transitions, ["done"]),
    ).toEqual([])
  })
})

describe("pendingFromDrop", () => {
  test("fetch throw snaps and sets reach error", () => {
    expect(
      pendingFromDrop("ABC-1", "To Do", "Done", ["3"], "Could not reach Jira."),
    ).toEqual({
      key: "ABC-1",
      to: "Done",
      matches: [],
      error: "Could not reach Jira.",
    })
  })

  test("http fail snaps and keeps the message", () => {
    expect(
      pendingFromDrop("ABC-1", "To Do", "Done", ["3"], "Token rejected."),
    ).toEqual({
      key: "ABC-1",
      to: "Done",
      matches: [],
      error: "Token rejected.",
    })
  })

  test("same column after fetch is still a no-op", () => {
    expect(
      pendingFromDrop("ABC-1", "Done", "Done", ["3"], transitions),
    ).toBe(null)
  })
})

describe("preview", () => {
  test("matches null ghosts the card in dest", () => {
    const shown = preview(columns, {
      key: "ABC-1",
      to: "Done",
      matches: null,
      error: null,
    })
    expect(shown[0]?.cards.map((c) => c.key)).toEqual([])
    expect(shown[1]?.cards.map((c) => c.key)).toEqual(["ABC-1"])
  })

  test("empty matches snaps the card back", () => {
    const shown = preview(columns, {
      key: "ABC-1",
      to: "Done",
      matches: [],
      error: "Could not reach Jira.",
    })
    expect(shown[0]?.cards.map((c) => c.key)).toEqual(["ABC-1"])
    expect(shown[1]?.cards.map((c) => c.key)).toEqual([])
  })

  test("one match keeps the ghost in dest until confirm", () => {
    const shown = preview(columns, {
      key: "ABC-1",
      to: "Done",
      matches: [{ id: "31", name: "Done", to: { id: "3" } }],
      error: null,
    })
    expect(shown[1]?.cards.map((c) => c.key)).toEqual(["ABC-1"])
  })
})
