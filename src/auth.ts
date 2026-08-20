import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

function allowedEmailDomain(): string | undefined {
  const raw = process.env.ALLOWED_EMAIL_DOMAIN?.trim()
  if (!raw) return undefined
  return raw.replace(/^@/, "").toLowerCase()
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/",
    error: "/denied",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false

      const domain = allowedEmailDomain()
      if (!domain) return true

      const email = profile?.email
      if (!email) return false

      const verified = (profile as { email_verified?: boolean } | undefined)
        ?.email_verified
      if (verified === false) return false

      const emailDomain = email.split("@").at(-1)?.toLowerCase()
      return emailDomain === domain
    },
  },
})
