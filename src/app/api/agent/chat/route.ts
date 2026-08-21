import { NextResponse } from "next/server"

import { runAgentChat } from "@/lib/agent"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: { role: string; content: string }[]
  }
  const result = await runAgentChat(body.messages ?? [])
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status || 502 },
    )
  }
  return NextResponse.json({
    reply: result.reply,
    proposal: result.proposal,
  })
}
