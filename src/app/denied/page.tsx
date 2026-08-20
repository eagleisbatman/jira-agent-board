import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().replace(/^@/, "")
  const accessDenied = !error || error === "AccessDenied"

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              {accessDenied
                ? "This account is not allowed"
                : "Sign-in did not finish"}
            </CardTitle>
            <CardDescription>
              {accessDenied
                ? domain
                  ? `Only Google accounts on ${domain} can sign in here.`
                  : "This instance did not accept the Google account you used."
                : "Google sign-in stopped before a session could be created. You can try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Switch Google accounts, or ask whoever runs this instance to
              allow your domain.
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button asChild variant="outline">
              <Link href="/">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
