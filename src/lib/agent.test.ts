import { describe, expect, test } from "bun:test"

import {
  confirmProposal,
  dropProposal,
  proposeCreate,
  proposeTransition,
} from "./proposals"
import { agentError } from "./agent"
import { setIssueLabels } from "./jira"
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

describe("proposals", () => {
  test("create propose does not write Jira", () => {
    const proposal = proposeCreate("Plant rice")
    expect(proposal.kind).toBe("create")
    expect(proposal.payload).toEqual({ summary: "Plant rice" })
  })

  test("confirm false drops the proposal and writes nothing", async () => {
    const proposal = proposeCreate("Plant rice")
    const result = await confirmProposal(proposal.id, false, settings, async () => {
      throw new Error("Jira must not be called")
    })
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(400)
    const again = await confirmProposal(proposal.id, true, settings, async () => {
      throw new Error("dropped")
    })
    expect(again.ok).toBe(false)
    if (again.ok) throw new Error("expected fail")
    expect(again.message).toBe("That proposal expired. Ask again.")
  })

  test("unknown proposalId is expired copy", async () => {
    const result = await confirmProposal("missing", true, settings, async () => {
      throw new Error("no")
    })
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(404)
    expect(result.message).toBe("That proposal expired. Ask again.")
  })

  test("confirm true creates via existing path", async () => {
    const proposal = proposeCreate("Plant rice")
    const result = await confirmProposal(proposal.id, true, settings, async (input) => {
      expect(String(input)).toContain("/rest/api/3/issue")
      return json({ key: "ABC-9" }, 201)
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("expected ok")
    expect(result.key).toBe("ABC-9")
  })

  test("transition confirm posts the id", async () => {
    const proposal = proposeTransition("ABC-1", "31", "Done")
    const result = await confirmProposal(proposal.id, true, settings, async (_input, init) => {
      expect(init?.body ? JSON.parse(String(init.body)) : null).toEqual({
        transition: { id: "31" },
      })
      return new Response(null, { status: 204 })
    })
    expect(result.ok).toBe(true)
    dropProposal(proposal.id)
  })
})

describe("setIssueLabels", () => {
  test("empty add and remove is 400", async () => {
    const result = await setIssueLabels(settings, "ABC-1", [], [])
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(400)
  })

  test("unknown key is 404", async () => {
    const result = await setIssueLabels(settings, "ZZZ-1", ["bug"], [], async () =>
      json({}, 404),
    )
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected fail")
    expect(result.status).toBe(404)
  })

  test("add and remove hit Jira update", async () => {
    const calls: { url: string; body: unknown }[] = []
    const result = await setIssueLabels(
      settings,
      "ABC-1",
      ["bug"],
      ["wip"],
      async (input, init) => {
        calls.push({
          url: String(input),
          body: init?.body ? JSON.parse(String(init.body)) : null,
        })
        if (String(input).includes("/issue/ABC-1") && (!init || !init.method || init.method === "GET")) {
          return json({ key: "ABC-1" })
        }
        return new Response(null, { status: 204 })
      },
    )
    expect(result.ok).toBe(true)
    const put = calls.find((call) => call.body && typeof call.body === "object")
    expect(put?.body).toEqual({
      update: { labels: [{ add: "bug" }, { remove: "wip" }] },
    })
  })
})

describe("agentError", () => {
  test("missing key is 503", () => {
    const prevKey = process.env.AGENT_API_KEY
    const prevUrl = process.env.AGENT_BASE_URL
    delete process.env.AGENT_API_KEY
    delete process.env.AGENT_BASE_URL
    const result = agentError()
    expect(result?.status).toBe(503)
    expect(result?.message).toBe("Agent is not configured.")
    if (prevKey) process.env.AGENT_API_KEY = prevKey
    if (prevUrl) process.env.AGENT_BASE_URL = prevUrl
  })
})
