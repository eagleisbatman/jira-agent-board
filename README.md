# Jira Agent Board

Self-hosted Jira Kanban board with a confirm-first agent. You bring the Jira
site and token.

**This repository is at step 1:** Google sign-in, an optional email-domain
gate, a signed-in identity page, light/dark theme, and a Docker image for
Railway. The board, Jira API, and agent are not here yet.

## What you get today

- Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (neutral tokens)
- Auth.js (NextAuth v5) with the Google provider
- Optional `ALLOWED_EMAIL_DOMAIN` — reject other emails with a clear page
- After sign-in: name, email, avatar, sign out, theme toggle
- Multi-stage Dockerfile, Next.js `output: "standalone"`

## Quick start

```bash
bun install
cp .env.example .env.local
# fill AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
bun dev
```

Full Google Cloud, Docker, and Railway instructions: [SETUP.md](./SETUP.md).

## Scripts

| Command | Purpose |
| --- | --- |
| `bun dev` | Local development |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |

## License

The repository does not ship a license file yet. Treat it as source-available
until one is added.
