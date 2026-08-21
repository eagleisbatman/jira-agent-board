import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-medium">Jira Agent Board</p>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Board</Link>
          </Button>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Jira connection</CardTitle>
            <CardDescription>
              Site URL, project, and API token land here next. Not Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Form is not wired yet. This page exists so the app has a place
              to put Jira credentials without a login.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
