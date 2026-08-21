import { describe, expect, test } from "bun:test"

describe("auth boot", () => {
  test("loads without AUTH env", async () => {
    delete process.env.AUTH_SECRET
    delete process.env.AUTH_GOOGLE_ID
    delete process.env.AUTH_GOOGLE_SECRET
    const mod = await import("./auth")
    expect(typeof mod.handlers.GET).toBe("function")
  })
})
