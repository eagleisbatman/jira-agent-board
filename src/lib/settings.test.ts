import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import {
  mergeSettings,
  missingFields,
  readSettings,
  toPublic,
  writeSettings,
  type Settings,
} from "./settings"

const sample: Settings = {
  siteUrl: "https://acme.atlassian.net",
  email: "ops@acme.test",
  apiToken: "tok-secret-9xyz",
  projectKey: "ABC",
  boardId: null,
}

let dir: string

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
})

describe("missingFields", () => {
  test("names the four required labels", () => {
    expect(missingFields({})).toEqual([
      "Site URL",
      "Email",
      "API token",
      "Project key",
    ])
  })

  test("passes when required fields are present", () => {
    expect(
      missingFields({
        siteUrl: "https://acme.atlassian.net",
        email: "ops@acme.test",
        apiToken: "x",
        projectKey: "ABC",
      }),
    ).toEqual([])
  })
})

describe("settings file", () => {
  test("round-trips JSON and redacts the token", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "jab-settings-"))
    const file = path.join(dir, "settings.json")
    await writeSettings(sample, file)
    const stored = await readSettings(file)
    expect(stored).toEqual(sample)
    const pub = toPublic(stored)
    expect(pub).toEqual({
      configured: true,
      siteUrl: sample.siteUrl,
      email: sample.email,
      projectKey: sample.projectKey,
      boardId: null,
      tokenSet: true,
      tokenLast4: "9xyz",
    })
    expect(JSON.stringify(pub)).not.toContain("tok-secret")
  })

  test("empty token on later save keeps the stored one", () => {
    const next = mergeSettings(sample, {
      siteUrl: "https://acme.atlassian.net",
      email: "ops@acme.test",
      apiToken: "",
      projectKey: "ABC",
      boardId: "42",
    })
    expect(next.apiToken).toBe("tok-secret-9xyz")
    expect(next.boardId).toBe("42")
  })

  test("missing file is not configured", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "jab-settings-"))
    const stored = await readSettings(path.join(dir, "settings.json"))
    expect(stored).toBeNull()
    expect(toPublic(null)).toEqual({ configured: false })
  })
})
