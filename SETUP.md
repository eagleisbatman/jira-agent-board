# Setup

This is the sign-in step only. There is no Jira connection, board, or agent yet.

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- A Google Cloud project you can create an OAuth client in
- Docker, if you want to run the production image locally
- A Railway project that builds from the Dockerfile, if you want to host it

## 1. Clone and install

```bash
git clone https://github.com/eagleisbatman/jira-agent-board.git
cd jira-agent-board
bun install
cp .env.example .env.local
```

## 2. Create a Google OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Go to **APIs & Services → OAuth consent screen**. Choose External (or
   Internal if you are on Google Workspace and only want people in your org).
   Fill the required app name and support email. You do not need extra scopes
   beyond the defaults Auth.js requests (`openid`, `email`, `profile`).
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Authorized JavaScript origins:
   - Local: `http://localhost:3000`
   - Railway: `https://<your-service-domain>`
7. Authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Railway: `https://<your-service-domain>/api/auth/callback/google`
8. Copy the client ID and client secret into `.env.local` as `AUTH_GOOGLE_ID`
   and `AUTH_GOOGLE_SECRET`.

Google allows many redirect URIs on one client, so local and production can
share a client. Separate clients per environment are also fine.

## 3. Fill the rest of `.env.local`

```bash
# any 32+ character random string
openssl rand -base64 32
```

Put that value in `AUTH_SECRET`.

Leave `AUTH_URL=http://localhost:3000` for local work. Set `AUTH_TRUST_HOST=true`.

`ALLOWED_EMAIL_DOMAIN` is optional:

- Unset or empty: any Google account can sign in.
- Set to a domain without `@` (for example `example.com`): only addresses on
  that domain are accepted. Everyone else lands on a “not allowed” page.

Do not invent Jira or MCP values yet. Those commented keys are placeholders.

## 4. Run locally

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and use **Continue with Google**.

```bash
bun run lint
bun run typecheck
```

## 5. Docker (production-shaped)

The image uses Next.js `output: "standalone"` and the official Bun multi-stage
pattern. You still pass real secrets at **run** time, not bake them into the image.

```bash
docker build -t jira-agent-board .
docker run --rm -p 3000:3000 --env-file .env.local jira-agent-board
```

`AUTH_URL` inside the container should still be the URL the browser uses
(`http://localhost:3000` for this run). `AUTH_TRUST_HOST=true` is already in
the example file.

## 6. Railway

Do not use `railway up` from this repo unless you intend to deploy. When you
are ready:

1. New Railway project from this GitHub repo.
2. Railway should detect the Dockerfile. If it asks, choose **Dockerfile**.
3. Set the same variables as `.env.example` in the service Variables tab:
   - `AUTH_SECRET` — a new random value, not the local one if you can help it
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
   - `AUTH_URL` — `https://<your-service-domain>` (the public HTTPS URL)
   - `AUTH_TRUST_HOST` — `true`
   - `ALLOWED_EMAIL_DOMAIN` — optional
4. Add that production callback URL to the Google OAuth client.
5. Deploy from the Railway dashboard or GitHub integration.

There is no `vercel.json`. This app is meant to run as a container.
