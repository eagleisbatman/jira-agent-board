import { NextResponse } from "next/server"

import { runAgentChat } from "@/lib/agent"
import { readSettings } from "@/lib/settings"

export async function POST(request: Request) {
  if (!(await readSettings())) {
    return NextResponse.json({ error: "Add your site and token." }, { status: 400 })
  }
  const body = (await request.json()) as {
    messages?: { role: string; content: string }[]
  }
  const messages = body.messages ?? []
  const result = await runAgentChat(messages)
  if (!result.ok) {
    const status = result.status === 503 ? 503 : result.status === 400 ? 400 : 502
    return NextResponse.json({ error: result.message }, { status })
  }
  return NextResponse.json({
    reply: result.reply,
    proposal: result.proposal,
  })
}
