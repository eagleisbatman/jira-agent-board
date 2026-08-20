import { auth } from "@/auth"
import { IdentityCard } from "@/components/identity-card"
import { SignInButton } from "@/components/sign-in-button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await auth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {session?.user ? (
          <IdentityCard user={session.user} />
        ) : (
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Use your Google account. If this instance only accepts a
                certain email domain, you will find out immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No password here. Google confirms the account; this app only
                keeps a session cookie on this device.
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <SignInButton />
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  )
}
