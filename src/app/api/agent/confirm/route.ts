import { NextResponse } from "next/server"

import { confirmProposal } from "@/lib/proposals"
import { readSettings } from "@/lib/settings"

export async function POST(request: Request) {
  const settings = await readSettings()
  if (!settings) {
    return NextResponse.json({ error: "Add your site and token." }, { status: 400 })
  }
  const body = (await request.json()) as { proposalId?: string; confirm?: boolean }
  const id = (body.proposalId ?? "").trim()
  if (!id) {
    return NextResponse.json(
      { error: "That proposal expired. Ask again." },
      { status: 404 },
    )
  }
  const result = await confirmProposal(id, body.confirm === true, settings)
  if (!result.ok) {
    const status = result.status || 502
    return NextResponse.json({ error: result.message }, { status })
  }
  if (result.key) {
    return NextResponse.json({ key: result.key }, { status: 201 })
  }
  return new NextResponse(null, { status: 204 })
}
