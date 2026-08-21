import type { Settings } from "./settings"

export type { Settings }

export type Card = {
  key: string
  summary: string
  assignee: string | null
}

export type Column = {
  name: string
  cards: Card[]
}

export type BoardOk = {
  ok: true
  boardId: string
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
  return "Could not reach Jira."
}

type FetchFn = typeof fetch

async function jiraGet(
  settings: Settings,
  resource: string,
  fetchFn: FetchFn,
): Promise<{ ok: true; data: unknown } | BoardFail> {
  const url = `${settings.siteUrl}${resource}`
  const auth = Buffer.from(`${settings.email}:${settings.apiToken}`).toString(
    "base64",
  )
  try {
    const res = await fetchFn(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
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

function mapColumns(
  columns: ConfigColumn[],
  issues: {
    key: string
    fields?: {
      summary?: string
      status?: { id?: string; name?: string }
      assignee?: { displayName?: string } | null
    }
  }[],
): Column[] {
  return columns.map((column) => {
    const statusIds = new Set((column.statuses ?? []).map((status) => status.id))
    const cards: Card[] = []
    for (const issue of issues) {
      const statusId = issue.fields?.status?.id
      if (!statusId || !statusIds.has(statusId)) continue
      cards.push({
        key: issue.key,
        summary: issue.fields?.summary ?? "",
        assignee: issue.fields?.assignee?.displayName ?? null,
      })
    }
    return { name: column.name, cards }
  })
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
    if (!listed.ok) return listed
    const values =
      listed.data && typeof listed.data === "object" && "values" in listed.data
        ? (listed.data as { values: { id: number | string; type?: string }[] })
            .values
        : []
    boardId = pickBoardId(values)
    if (!boardId) {
      return { ok: false, status: 404, message: jiraMessage(404) }
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
  const issues =
    issuesRes.data &&
    typeof issuesRes.data === "object" &&
    "issues" in issuesRes.data
      ? ((issuesRes.data as { issues: Parameters<typeof mapColumns>[1] }).issues ??
        [])
      : []

  return { ok: true, boardId, columns: mapColumns(columns, issues) }
}
