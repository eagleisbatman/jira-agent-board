import { describe, expect, test } from "bun:test"

import { jiraMessage, loadBoard } from "./jira"
import type { Settings } from "./settings"

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
    expect(result.columns.map((c) => c.statusIds)).toEqual([["1"], ["3"]])
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

  test("zero Agile boards uses statuses and search/jql", async () => {
    const seen: string[] = []
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      seen.push(url)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          {
            id: "10000",
            name: "Story",
            statuses: [
              { id: "1", name: "To Do" },
              { id: "3", name: "Done" },
            ],
          },
          {
            id: "10001",
            name: "Bug",
            statuses: [
              { id: "1", name: "To Do" },
              { id: "2", name: "In Progress" },
            ],
          },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [] })
      }
      if (url.includes("/search/jql")) {
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
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.boardId).toBeNull()
    expect(result.columns.map((c) => c.name)).toEqual(["To Do", "Done", "In Progress"])
    expect(result.columns.map((c) => c.statusIds)).toEqual([["1"], ["3"], ["2"]])
    expect(result.columns[0]?.cards).toEqual([
      { key: "ABC-1", summary: "First", assignee: "Ada" },
    ])
    expect(result.columns[1]?.cards).toEqual([
      { key: "ABC-2", summary: "Second", assignee: null },
    ])
    expect(seen.some((u) => u.includes("/search/jql"))).toBe(true)
    expect(seen.some((u) => u.includes("/rest/api/3/search?") || u.endsWith("/rest/api/3/search"))).toBe(false)
    expect(seen.some((u) => u.includes("/rest/agile/1.0/board/") && u.includes("/issue"))).toBe(false)
  })

  test("zero issues on a no-board project is success", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          { id: "10000", name: "Task", statuses: [{ id: "1", name: "To Do" }] },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [] })
      }
      if (url.includes("/search/jql")) return json({ issues: [] })
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.boardId).toBeNull()
    expect(result.columns.map((c) => c.name)).toEqual(["To Do"])
    expect(result.columns[0]?.cards).toEqual([])
  })

  test("Agile list 404 is treated as zero boards", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          { id: "10000", name: "Task", statuses: [{ id: "1", name: "To Do" }] },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({}, 404)
      }
      if (url.includes("/search/jql")) return json({ issues: [] })
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.boardId).toBeNull()
  })

  test("search/jql id-only envelope maps onto status lanes", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          { id: "10000", name: "Task", statuses: [{ id: "1", name: "To Do" }] },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [] })
      }
      if (url.includes("/search/jql")) {
        return json({ isLast: true, issues: [{ id: "10001", key: "FP-1" }] })
      }
      if (url.includes("/issue/bulkfetch")) {
        return json({
          issues: [
            {
              id: "10001",
              key: "FP-1",
              fields: {
                summary: "Created",
                status: { id: 1, name: "To Do" },
                assignee: null,
              },
            },
          ],
        })
      }
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.columns[0]?.cards).toEqual([
      { key: "FP-1", summary: "Created", assignee: null },
    ])
  })

  test("numeric status id still lands on the lane", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          { id: "10000", name: "Task", statuses: [{ id: "1", name: "To Do" }] },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [] })
      }
      if (url.includes("/search/jql")) {
        return json({
          isLast: true,
          issues: [
            {
              key: "FP-1",
              fields: {
                summary: "Created",
                status: { id: 1, name: "To Do" },
                assignee: null,
              },
            },
          ],
        })
      }
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.columns[0]?.cards).toEqual([
      { key: "FP-1", summary: "Created", assignee: null },
    ])
  })

  test("same status name on two ids does not duplicate the card", async () => {
    const fetchFn = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          {
            id: "10000",
            name: "Story",
            statuses: [{ id: "1", name: "To Do" }],
          },
          {
            id: "10001",
            name: "Bug",
            statuses: [{ id: "2", name: "To Do" }],
          },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [] })
      }
      if (url.includes("/search/jql")) {
        return json({
          isLast: true,
          issues: [
            {
              key: "FP-1",
              fields: {
                summary: "Created",
                status: { id: 1, name: "To Do" },
                assignee: null,
              },
            },
          ],
        })
      }
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.columns.map((c) => c.statusIds)).toEqual([["1"], ["2"]])
    expect(result.columns[0]?.cards.map((c) => c.key)).toEqual(["FP-1"])
    expect(result.columns[1]?.cards).toEqual([])
  })

  test("no-board search is POST /search/jql with fields", async () => {
    let search: { method?: string; body?: { fields?: string[] } } = {}
    const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/myself")) return json({ accountId: "1" })
      if (url.includes("/project/") && url.endsWith("/statuses")) {
        return json([
          { id: "10000", name: "Task", statuses: [{ id: "1", name: "To Do" }] },
        ])
      }
      if (url.includes("/project/")) return json({ key: "ABC" })
      if (url.includes("/board?") && !url.includes("/issue")) {
        return json({ values: [] })
      }
      if (url.includes("/search/jql")) {
        search = {
          method: init?.method,
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
        }
        return json({
          isLast: true,
          issues: [
            {
              key: "FP-1",
              fields: {
                summary: "Created",
                status: { id: "1", name: "To Do" },
                assignee: null,
              },
            },
          ],
        })
      }
      return json({}, 404)
    }
    const result = await loadBoard(settings, fetchFn)
    expect(result.ok).toBe(true)
    expect(search.method).toBe("POST")
    expect(search.body?.fields).toEqual(["summary", "status", "assignee"])
  })
})
