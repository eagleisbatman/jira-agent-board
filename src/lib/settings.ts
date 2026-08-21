import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export type Settings = {
  siteUrl: string
  email: string
  apiToken: string
  projectKey: string
  boardId: string | null
}

export type PublicSettings =
  | { configured: false }
  | {
      configured: true
      siteUrl: string
      email: string
      projectKey: string
      boardId: string | null
      tokenSet: boolean
      tokenLast4: string
    }

export type SettingsInput = {
  siteUrl?: string
  email?: string
  apiToken?: string
  projectKey?: string
  boardId?: string | null
}

export const defaultSettingsPath = path.join(process.cwd(), "data", "settings.json")

const REQUIRED: { key: "siteUrl" | "email" | "apiToken" | "projectKey"; label: string }[] = [
  { key: "siteUrl", label: "Site URL" },
  { key: "email", label: "Email" },
  { key: "apiToken", label: "API token" },
  { key: "projectKey", label: "Project key" },
]

function trimUrl(value: string) {
  return value.trim().replace(/\/+$/, "")
}

export function missingFields(input: SettingsInput): string[] {
  const present = {
    siteUrl: trimUrl(input.siteUrl ?? ""),
    email: (input.email ?? "").trim(),
    apiToken: (input.apiToken ?? "").trim(),
    projectKey: (input.projectKey ?? "").trim(),
  }
  return REQUIRED.filter(({ key }) => !present[key]).map(({ label }) => label)
}

export function fieldErrors(labels: string[]): Record<string, string> {
  const byLabel: Record<string, string> = {
    "Site URL": "siteUrl",
    Email: "email",
    "API token": "apiToken",
    "Project key": "projectKey",
  }
  const errors: Record<string, string> = {}
  for (const label of labels) {
    errors[byLabel[label] ?? label] = `${label} is required.`
  }
  return errors
}

export function mergeSettings(
  existing: Settings | null,
  incoming: SettingsInput,
): Settings {
  const token = incoming.apiToken?.trim() || existing?.apiToken || ""
  let boardId = existing?.boardId ?? null
  if (incoming.boardId !== undefined) {
    const raw = incoming.boardId
    boardId = raw === null || String(raw).trim() === "" ? null : String(raw).trim()
  }
  return {
    siteUrl: trimUrl(incoming.siteUrl ?? existing?.siteUrl ?? ""),
    email: (incoming.email ?? existing?.email ?? "").trim(),
    apiToken: token,
    projectKey: (incoming.projectKey ?? existing?.projectKey ?? "").trim(),
    boardId,
  }
}

export function toPublic(settings: Settings | null): PublicSettings {
  if (!settings) return { configured: false }
  return {
    configured: true,
    siteUrl: settings.siteUrl,
    email: settings.email,
    projectKey: settings.projectKey,
    boardId: settings.boardId,
    tokenSet: Boolean(settings.apiToken),
    tokenLast4: settings.apiToken.slice(-4),
  }
}

export async function readSettings(
  filePath = defaultSettingsPath,
): Promise<Settings | null> {
  try {
    const raw = await readFile(filePath, "utf8")
    return JSON.parse(raw) as Settings
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null
    throw error
  }
}

export async function writeSettings(
  settings: Settings,
  filePath = defaultSettingsPath,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8")
}
