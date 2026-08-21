import { describe, expect, test } from "bun:test"

import {
  createIssue,
  jiraMessage,
  listTransitions,
  transitionIssue,
} from "./jira"
import type { Settings } from "./settings"

const settings: Settings = {
  siteUrl: "https://acme.atlassian.net",
  email: "ops@acme.test",
  apiToken: "tok",
  projectKey: "ABC",
  boardId: "7",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("jiraMessage", () => {
  test("409 is a rejected change", () => {
    expect(jiraMessage(409)).toBe("Jira rejected the change.")
    expect(jiraMessage(400)).toBe("Could not save this issue.")
  })
})

describe("createIssue", () => {
  test("posts a Task with summary only", async () => {
    const calls: { url: string; body: unknown }[] = []
    const result = await createIssue(settings, "Plant rice", async (input, init) => {
      calls.push({
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      })
      return json({ key: "ABC-9" }, 201)
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.key).toBe("ABC-9")
    expect(calls[0]?.url).toBe("https://acme.atlassian.net/rest/api/3/issue")
    expect(calls[0]?.body).toEqual({
      fields: {
        project: { key: "ABC" },
        summary: "Plant rice",
        issuetype: { name: "Task" },
      },
    })
  })

  test("401 invents no key", async () => {
    const result = await createIssue(settings, "X", async () => json({}, 401))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(401)
    expect("key" in result).toBe(false)
  })
})

describe("listTransitions", () => {
  test("returns id and name", async () => {
    const result = await listTransitions(settings, "ABC-1", async () =>
      json({
        transitions: [
          { id: "21", name: "In Progress" },
          { id: "31", name: "Done" },
        ],
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.transitions).toEqual([
      { id: "21", name: "In Progress" },
      { id: "31", name: "Done" },
    ])
  })
})

describe("transitionIssue", () => {
  test("posts the transition id", async () => {
    let body: unknown
    const result = await transitionIssue(
      settings,
      "ABC-1",
      "31",
      async (_input, init) => {
        body = init?.body ? JSON.parse(String(init.body)) : null
        return new Response(null, { status: 204 })
      },
    )
    expect(result.ok).toBe(true)
    expect(body).toEqual({ transition: { id: "31" } })
  })

  test("409 is a rejected change", async () => {
    const result = await transitionIssue(settings, "ABC-1", "31", async () =>
      json({}, 409),
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(409)
    expect(result.message).toBe("Jira rejected the change.")
  })
})
