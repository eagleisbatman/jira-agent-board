import { describe, expect, test } from "bun:test"

import { putSettings } from "./put-settings"

describe("putSettings", () => {
  test("fetch throw is reach error", async () => {
    const result = await putSettings({}, async () => {
      throw new Error("offline")
    })
    expect(result).toEqual({ ok: false, message: "Could not reach Jira." })
  })

  test("timeout aborts a hung PUT", async () => {
    const result = await putSettings(
      {},
      async (_input, init) => {
        await new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"))
          })
        })
        throw new Error("unreachable")
      },
      20,
    )
    expect(result).toEqual({ ok: false, message: "Could not reach Jira." })
  })

  test("empty body is reach error", async () => {
    const result = await putSettings({}, async () => new Response("", { status: 200 }))
    expect(result).toEqual({ ok: false, message: "Could not reach Jira." })
  })

  test("returns JSON", async () => {
    const result = await putSettings({}, async () => {
      return new Response(JSON.stringify({ configured: true, connected: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    })
    expect(result).toEqual({
      ok: true,
      data: { configured: true, connected: true },
    })
  })
})
