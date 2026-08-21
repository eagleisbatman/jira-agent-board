import { NextResponse } from "next/server"

import { loadBoard } from "@/lib/jira"
import {
  fieldErrors,
  mergeSettings,
  missingFields,
  readSettings,
  toPublic,
  writeSettings,
} from "@/lib/settings"

export async function GET() {
  return NextResponse.json(toPublic(await readSettings()))
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    siteUrl?: string
    email?: string
    apiToken?: string
    projectKey?: string
    boardId?: string | null
  }
  const existing = await readSettings()
  const merged = mergeSettings(existing, body)
  const missing = missingFields(merged)
  if (missing.length > 0) {
    return NextResponse.json({ errors: fieldErrors(missing) }, { status: 400 })
  }
  const probed = await loadBoard(merged)
  if (probed.ok) {
    merged.boardId = probed.boardId
  }
  await writeSettings(merged)
  if (!probed.ok) {
    return NextResponse.json({
      ...toPublic(merged),
      error: { status: probed.status, message: probed.message },
    })
  }
  return NextResponse.json({
    ...toPublic(merged),
    connected: true,
  })
}
