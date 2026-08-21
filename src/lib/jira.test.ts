import { describe, expect, test } from "bun:test"

import { jiraMessage, loadBoard, type Settings } from "./jira"

const settings: Settings = {
  siteUrl: "https://acme.atlassian.net",
  email: "ops@acme.test",
  apiToken: "tok",
  projectKey: "ABC",
  boardId: null,
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("jiraMessage", () => {
  test("maps Jira status to Shuri copy", () => {
    expect(jiraMessage(401)).toBe("Token rejected.")
    expect(jiraMessage(403)).toBe("No permission for this project.")
    expect(jiraMessage(404)).toBe("Site, project, or board not found.")
    expect(jiraMessage(0)).toBe("Could not reach Jira.")
  })
})

describe("loadBoard", () => {
  test("401 is a token error and invents no cards", async () => {
    const result = await loadBoard(settings, async () => json({ error: "no" }, 401))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(401)
    expect(result.message).toBe("Token rejected.")
  })

  test("empty issues is success with columns", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({
          values: [
            { id: 9, type: "scrum" },
            { id: 7, type: "kanban" },
          ],
        })
      }
      if (url.endsWith("/configuration")) {
        return json({
          columnConfig: {
            columns: [
              { name: "To Do", statuses: [{ id: "1" }] },
              { name: "Done", statuses: [{ id: "3" }] },
            ],
          },
        })
      }
      if (url.includes("/issue")) return json({ issues: [] })
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.boardId).toBe("7")
    expect(result.columns.map((c) => c.name)).toEqual(["To Do", "Done"])
    expect(result.columns.every((c) => c.cards.length === 0)).toBe(true)
  })

  test("maps cards onto columns by status id", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [{ id: 7, type: "kanban" }] })
      }
      if (url.endsWith("/configuration")) {
        return json({
          columnConfig: {
            columns: [
              { name: "To Do", statuses: [{ id: "1" }] },
              { name: "Done", statuses: [{ id: "3" }] },
            ],
          },
        })
      }
      if (url.includes("/issue")) {
        return json({
          issues: [
            {
              key: "ABC-1",
              fields: {
                summary: "First",
                status: { id: "1", name: "To Do" },
                assignee: { displayName: "Ada" },
              },
            },
            {
              key: "ABC-2",
              fields: {
                summary: "Second",
                status: { id: "3", name: "Done" },
                assignee: null,
              },
            },
          ],
        })
      }
      return json({}, 404)
    }
    const result = await loadBoard({ ...settings, boardId: "7" }, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.columns[0]?.cards).toEqual([
      { key: "ABC-1", summary: "First", assignee: "Ada" },
    ])
    expect(result.columns[1]?.cards).toEqual([
      { key: "ABC-2", summary: "Second", assignee: null },
    ])
  })
})
