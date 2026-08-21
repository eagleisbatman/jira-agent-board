import { NextResponse } from "next/server"

import { setIssueLabels } from "@/lib/jira"
import { readSettings } from "@/lib/settings"

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params
  const settings = await readSettings()
  if (!settings) {
    return NextResponse.json({ error: "Add your site and token." }, { status: 400 })
  }
  const body = (await request.json()) as { add?: string[]; remove?: string[] }
  const add = body.add ?? []
  const remove = body.remove ?? []
  const result = await setIssueLabels(settings, key, add, remove)
  if (!result.ok) {
    return NextResponse.json(
      { error: { status: result.status, message: result.message } },
      { status: result.status || 502 },
    )
  }
  return new NextResponse(null, { status: 204 })
}
