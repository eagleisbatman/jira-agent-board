import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <p className="text-sm font-medium">Jira Agent Board</p>
      <nav className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Board</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings">Settings</Link>
        </Button>
        <ThemeToggle />
      </nav>
    </header>
  )
}
