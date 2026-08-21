import { NextResponse } from "next/server"

import { createIssue } from "@/lib/jira"
import { readSettings } from "@/lib/settings"

export async function POST(request: Request) {
  const body = (await request.json()) as { summary?: string; confirm?: boolean }
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirm required." }, { status: 400 })
  }
  const summary = (body.summary ?? "").trim()
  if (!summary) {
    return NextResponse.json(
      { errors: { summary: "Summary is required." } },
      { status: 400 },
    )
  }
  const settings = await readSettings()
  if (!settings) {
    return NextResponse.json({ configured: false }, { status: 400 })
  }
  const result = await createIssue(settings, summary)
  if (!result.ok) {
    return NextResponse.json(
      { error: { status: result.status, message: result.message } },
      { status: result.status || 502 },
    )
  }
  return NextResponse.json({ key: result.key })
}
