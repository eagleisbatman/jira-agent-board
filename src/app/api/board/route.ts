import { NextResponse } from "next/server"

import { loadBoard } from "@/lib/jira"
import { readSettings, writeSettings } from "@/lib/settings"

export async function GET() {
  const settings = await readSettings()
  if (!settings) {
    return NextResponse.json({ configured: false })
  }
  const result = await loadBoard(settings)
  if (!result.ok) {
    return NextResponse.json({
      configured: true,
      projectKey: settings.projectKey,
      error: { status: result.status, message: result.message },
    })
  }
  if (result.boardId !== settings.boardId) {
    await writeSettings({ ...settings, boardId: result.boardId })
  }
  return NextResponse.json({
    configured: true,
    projectKey: settings.projectKey,
    boardId: result.boardId,
    columns: result.columns,
  })
}
