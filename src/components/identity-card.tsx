import { SignOutButton } from "@/components/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type IdentityUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function IdentityCard({ user }: { user: IdentityUser }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{user.name ?? "Signed in"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-sm font-medium">
              {user.name ?? "Name not provided"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email ?? "Email not provided"}
            </p>
          </div>
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">
          This is the account this instance sees. Sign out if it is not you.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <SignOutButton />
      </CardFooter>
    </Card>
  )
}
