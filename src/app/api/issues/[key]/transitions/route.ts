import { NextResponse } from "next/server"

import { listTransitions, transitionIssue } from "@/lib/jira"
import { readSettings } from "@/lib/settings"

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params
  const settings = await readSettings()
  if (!settings) {
    return NextResponse.json({ configured: false }, { status: 400 })
  }
  const result = await listTransitions(settings, key)
  if (!result.ok) {
    return NextResponse.json(
      { error: { status: result.status, message: result.message } },
      { status: result.status || 502 },
    )
  }
  return NextResponse.json({ transitions: result.transitions })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params
  const body = (await request.json()) as {
    transitionId?: string
    confirm?: boolean
  }
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirm required." }, { status: 400 })
  }
  const transitionId = (body.transitionId ?? "").trim()
  if (!transitionId) {
    return NextResponse.json(
      { errors: { transitionId: "Pick a status." } },
      { status: 400 },
    )
  }
  const settings = await readSettings()
  if (!settings) {
    return NextResponse.json({ configured: false }, { status: 400 })
  }
  const result = await transitionIssue(settings, key, transitionId)
  if (!result.ok) {
    return NextResponse.json(
      { error: { status: result.status, message: result.message } },
      { status: result.status || 502 },
    )
  }
  return NextResponse.json({ ok: true })
}
