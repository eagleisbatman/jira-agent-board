import type { Settings } from "./settings"

export type Card = {
  key: string
  summary: string
  assignee: string | null
}

export type Column = {
  name: string
  statusIds: string[]
  cards: Card[]
}

export type BoardOk = {
  ok: true
  boardId: string | null
  columns: Column[]
}

export type BoardFail = {
  ok: false
  status: 401 | 403 | 404 | 0
  message: string
}

export type BoardResult = BoardOk | BoardFail

export function jiraMessage(status: number): string {
  if (status === 401) return "Token rejected."
  if (status === 403) return "No permission for this project."
  if (status === 404) return "Site, project, or board not found."
  if (status === 409) return "Jira rejected the change."
  if (status === 400) return "Could not save this issue."
  return "Could not reach Jira."
}

export type WriteFail = {
  ok: false
  status: 400 | 401 | 403 | 404 | 409 | 0
  message: string
}

export type Transition = { id: string; name: string; to: { id: string } }

type FetchFn = typeof fetch

async function jiraGet(
  settings: Settings,
  resource: string,
  fetchFn: FetchFn,
  init?: { method?: string; body?: unknown },
): Promise<{ ok: true; data: unknown } | BoardFail> {
  const url = `${settings.siteUrl}${resource}`
  const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString(
    "base64",
  )
  try {
    const res = await fetchFn(url, {
      method: init?.method,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return { ok: false, status: res.status, message: jiraMessage(res.status) }
    }
    if (!res.ok) {
      return { ok: false, status: 0, message: jiraMessage(0) }
    }
    return { ok: true, data: await res.json() }
  } catch {
    return { ok: false, status: 0, message: jiraMessage(0) }
  }
}

function pickBoardId(values: { id: number | string; type?: string }[]): string | null {
  if (values.length === 0) return null
  const kanban = values.find((board) => board.type === "kanban")
  return String((kanban ?? values[0]).id)
}

type ConfigColumn = {
  name: string
  statuses?: { id: string }[]
}

type Issue = {
  key: string
  id?: string
  fields?: {
    summary?: string
    status?: { id?: string | number; name?: string }
    assignee?: { displayName?: string } | null
  }
}

function mapColumns(columns: ConfigColumn[], issues: Issue[]): Column[] {
  return columns.map((column) => {
    const statusIds = new Set(
      (column.statuses ?? []).map((status) => String(status.id)),
    )
    const cards: Card[] = []
    for (const issue of issues) {
      const statusId =
        issue.fields?.status?.id != null ? String(issue.fields.status.id) : ""
      const statusName = issue.fields?.status?.name
      const matched =
        (statusId !== "" && statusIds.has(statusId)) ||
        (!!statusName && statusName === column.name)
      if (!matched) continue
      cards.push({
        key: issue.key,
        summary: issue.fields?.summary ?? "",
        assignee: issue.fields?.assignee?.displayName ?? null,
      })
    }
    return { name: column.name, statusIds: [...statusIds], cards }
  })
}

function issuesFrom(data: unknown): Issue[] {
  if (!data || typeof data !== "object") return []
  const raw =
    "issues" in data && Array.isArray((data as { issues: unknown }).issues)
      ? (data as { issues: unknown[] }).issues
      : "values" in data && Array.isArray((data as { values: unknown }).values)
        ? (data as { values: unknown[] }).values
        : []
  const issues: Issue[] = []
  for (const item of raw) {
    if (typeof item === "string" || typeof item === "number") {
      issues.push({ key: "", id: String(item) })
      continue
    }
    if (!item || typeof item !== "object") continue
    const rec = item as Record<string, unknown>
    const fields =
      rec.fields && typeof rec.fields === "object"
        ? (rec.fields as Issue["fields"])
        : undefined
    issues.push({
      key: typeof rec.key === "string" ? rec.key : "",
      id: rec.id != null ? String(rec.id) : undefined,
      fields,
    })
  }
  return issues
}

async function issuesWithFields(
  settings: Settings,
  fetchFn: FetchFn,
  issues: Issue[],
): Promise<{ ok: true; issues: Issue[] } | BoardFail> {
  if (issues.every((issue) => issue.fields?.status != null)) {
    return { ok: true, issues }
  }
  const ids = issues.map((issue) => issue.key || issue.id).filter(Boolean)
  if (ids.length === 0) return { ok: true, issues }
  const bulk = await jiraGet(
    settings,
    "/rest/api/3/issue/bulkfetch",
    fetchFn,
    { method: "POST", body: { issueIdsOrKeys: ids, fields: ["summary", "status", "assignee"] } },
  )
  if (!bulk.ok) return bulk
  return { ok: true, issues: issuesFrom(bulk.data) }
}

async function loadBoardFromStatuses(
  settings: Settings,
  fetchFn: FetchFn,
): Promise<BoardResult> {
  const statuses = await jiraGet(
    settings,
    `/rest/api/3/project/${encodeURIComponent(settings.projectKey)}/statuses`,
    fetchFn,
  )
  if (!statuses.ok) return statuses
  const columns: ConfigColumn[] = []
  const seen = new Set<string>()
  if (Array.isArray(statuses.data)) {
    for (const type of statuses.data) {
      if (!type || typeof type !== "object" || !("statuses" in type)) continue
      const list = (type as { statuses?: unknown }).statuses
      if (!Array.isArray(list)) continue
      for (const status of list) {
        if (!status || typeof status !== "object" || !("id" in status)) continue
        const id = String((status as { id: unknown }).id)
        if (!id || seen.has(id)) continue
        seen.add(id)
        const name =
          "name" in status && typeof (status as { name: unknown }).name === "string"
            ? (status as { name: string }).name
            : id
        columns.push({ name, statuses: [{ id }] })
      }
    }
  }
  const jql = `project = "${settings.projectKey.replaceAll('"', "")}"`
  const issuesRes = await jiraGet(
    settings,
    "/rest/api/3/search/jql",
    fetchFn,
    {
      method: "POST",
      body: {
        jql,
        fields: ["summary", "status", "assignee"],
        maxResults: 100,
      },
    },
  )
  if (!issuesRes.ok) return issuesRes
  const filled = await issuesWithFields(
    settings,
    fetchFn,
    issuesFrom(issuesRes.data),
  )
  if (!filled.ok) return filled
  return {
    ok: true,
    boardId: null,
    columns: mapColumns(columns, filled.issues),
  }
}

export async function loadBoard(
  settings: Settings,
  fetchFn: FetchFn = fetch,
): Promise<BoardResult> {
  const me = await jiraGet(settings, "/rest/api/3/myself", fetchFn)
  if (!me.ok) return me
  const project = await jiraGet(
    settings,
    `/rest/api/3/project/${encodeURIComponent(settings.projectKey)}`,
    fetchFn,
  )
  if (!project.ok) return project

  let boardId = settings.boardId
  if (!boardId) {
    const listed = await jiraGet(
      settings,
      `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(settings.projectKey)}`,
      fetchFn,
    )
    if (!listed.ok && listed.status !== 404) return listed
    const values =
      listed.ok &&
      listed.data &&
      typeof listed.data === "object" &&
      "values" in listed.data
        ? (listed.data as { values: { id: number | string; type?: string }[] })
            .values
        : []
    boardId = pickBoardId(values)
    if (!boardId) {
      return loadBoardFromStatuses(settings, fetchFn)
    }
  }

  const config = await jiraGet(
    settings,
    `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/configuration`,
    fetchFn,
  )
  if (!config.ok) return config
  const columns =
    config.data &&
    typeof config.data === "object" &&
    "columnConfig" in config.data
      ? ((config.data as { columnConfig?: { columns?: ConfigColumn[] } })
          .columnConfig?.columns ?? [])
      : []

  const issuesRes = await jiraGet(
    settings,
    `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/issue?fields=summary,status,assignee&maxResults=100`,
    fetchFn,
  )
  if (!issuesRes.ok) return issuesRes

  return { ok: true, boardId, columns: mapColumns(columns, issuesFrom(issuesRes.data)) }
}

async function jiraWrite(
  settings: Settings,
  resource: string,
  fetchFn: FetchFn,
  init: { method: string; body?: unknown },
): Promise<{ ok: true; data: unknown } | WriteFail> {
  try {
    const res = await fetchFn(`${settings.siteUrl}${resource}`, {
      method: init.method,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${settings.email}:${settings.apiToken}`).toString("base64")}`,
        ...(init.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    if (
      res.status === 400 ||
      res.status === 401 ||
      res.status === 403 ||
      res.status === 404 ||
      res.status === 409
    ) {
      return { ok: false, status: res.status, message: jiraMessage(res.status) }
    }
    if (!res.ok) {
      return { ok: false, status: 0, message: jiraMessage(0) }
    }
    const text = await res.text()
    return { ok: true, data: text ? JSON.parse(text) : null }
  } catch {
    return { ok: false, status: 0, message: jiraMessage(0) }
  }
}

export async function createIssue(
  settings: Settings,
  summary: string,
  fetchFn: FetchFn = fetch,
): Promise<{ ok: true; key: string } | WriteFail> {
  const result = await jiraWrite(settings, "/rest/api/3/issue", fetchFn, {
    method: "POST",
    body: {
      fields: {
        project: { key: settings.projectKey },
        summary,
        issuetype: { name: "Task" },
      },
    },
  })
  if (!result.ok) return result
  const key =
    result.data && typeof result.data === "object" && "key" in result.data
      ? String((result.data as { key: string }).key)
      : ""
  if (!key) {
    return { ok: false, status: 0, message: jiraMessage(0) }
  }
  return { ok: true, key }
}

export async function listTransitions(
  settings: Settings,
  key: string,
  fetchFn: FetchFn = fetch,
): Promise<{ ok: true; transitions: Transition[] } | WriteFail> {
  const result = await jiraGet(
    settings,
    `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`,
    fetchFn,
  )
  if (!result.ok) return result
  const raw =
    result.data && typeof result.data === "object" && "transitions" in result.data
      ? (result.data as {
          transitions: { id: string; name: string; to?: { id?: string } }[]
        }).transitions
      : []
  return {
    ok: true,
    transitions: raw.map((item) => ({
      id: String(item.id),
      name: item.name,
      to: { id: String(item.to?.id ?? "") },
    })),
  }
}

export async function transitionIssue(
  settings: Settings,
  key: string,
  transitionId: string,
  fetchFn: FetchFn = fetch,
): Promise<{ ok: true } | WriteFail> {
  const result = await jiraWrite(
    settings,
    `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`,
    fetchFn,
    { method: "POST", body: { transition: { id: transitionId } } },
  )
  if (!result.ok) return result
  return { ok: true }
}

export async function setIssueLabels(
  settings: Settings,
  key: string,
  add: string[],
  remove: string[],
  fetchFn: FetchFn = fetch,
): Promise<{ ok: true } | WriteFail> {
  if (add.length === 0 && remove.length === 0) {
    return { ok: false, status: 400, message: "Could not save this issue." }
  }
  const exists = await jiraGet(
    settings,
    `/rest/api/3/issue/${encodeURIComponent(key)}?fields=key`,
    fetchFn,
  )
  if (!exists.ok) return exists
  const labels = [
    ...add.map((label) => ({ add: label })),
    ...remove.map((label) => ({ remove: label })),
  ]
  const result = await jiraWrite(
    settings,
    `/rest/api/3/issue/${encodeURIComponent(key)}`,
    fetchFn,
    { method: "PUT", body: { update: { labels } } },
  )
  if (!result.ok) return result
  return { ok: true }
}

