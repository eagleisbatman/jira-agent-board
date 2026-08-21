import { describe, expect, test } from "bun:test"

import { matchesAfterDrop } from "./drag"

const transitions = [
  { id: "21", name: "In Progress", to: { id: "2" } },
  { id: "31", name: "Done", to: { id: "3" } },
  { id: "41", name: "Review", to: { id: "4" } },
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
