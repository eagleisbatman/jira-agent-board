import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { BoardError } from "@/components/board-error"
import { CreateIssue } from "@/components/create-issue"
import { MoveIssue } from "@/components/move-issue"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
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
      <div className="flex flex-1 gap-3 overflow-x-auto">
        {columns.map((column) => (
          <section key={column.name} className="w-72 shrink-0 space-y-2">
            <h2 className="text-sm font-medium">
              {column.name}{" "}
              <span className="text-muted-foreground">{column.cards.length}</span>
            </h2>
            {column.cards.map((card) => (
              <Card key={card.key} size="sm">
                <CardHeader>
                  <CardDescription>{card.key}</CardDescription>
                  <CardTitle>{card.summary}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{card.assignee ?? "Unassigned"}</span>
                  <MoveIssue issueKey={card.key} />
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
