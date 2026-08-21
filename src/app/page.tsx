import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { BoardError } from "@/components/board-error"
import { AgentChat } from "@/components/agent-chat"
import { CreateIssue } from "@/components/create-issue"
import { Board } from "@/components/board"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loadBoard } from "@/lib/jira"
import { readSettings, writeSettings, type Settings } from "@/lib/settings"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const settings = await readSettings()

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 py-6">
        {settings === null ? <NoConnection /> : <ConnectedBoard settings={settings} />}
      </main>
    </div>
  )
}

function NoConnection() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No Jira connection</CardTitle>
          <CardDescription>Add your site and token.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button asChild>
            <Link href="/settings">Open settings</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

async function ConnectedBoard({ settings }: { settings: Settings }) {
  const result = await loadBoard(settings)
  if (result.ok && result.boardId !== settings.boardId) {
    await writeSettings({ ...settings, boardId: result.boardId })
  }
  if (!result.ok) {
    return <BoardError message={result.message} />
  }

  const columns = result.columns
  if (columns.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-1 items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>No issues</CardTitle>
              <CardDescription>{settings.projectKey} is connected.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-end">
              <CreateIssue />
            </CardFooter>
          </Card>
        </div>
        <AgentChat projectKey={settings.projectKey} />
      </div>
    )
  }

  const total = columns.reduce((sum, column) => sum + column.cards.length, 0)

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className={`flex items-center gap-3 ${total === 0 ? "justify-between" : "justify-end"}`}>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">{settings.projectKey} is connected.</p>
        ) : null}
        <CreateIssue />
      </div>
      <Board columns={columns} />
      <AgentChat projectKey={settings.projectKey} />
    </div>
  )
}
