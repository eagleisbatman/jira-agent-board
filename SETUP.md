# Setup

Host this board.

## Local

```bash
git clone https://github.com/eagleisbatman/jira-agent-board.git
cd jira-agent-board
bun install
bun dev
```

Open http://localhost:3000. Add your Jira site and token at `/settings`.

Optional agent env in `.env.local`: `AGENT_BASE_URL`, `AGENT_API_KEY`, `AGENT_MODEL`. Missing those, the board still works and chat returns 503.

```bash
bun test
bun run lint
```

## Docker

```bash
docker build -t jira-agent-board .
docker run -p 3000:3000 -v jira-agent-board-data:/app/data jira-agent-board
```

No env file. Settings persist on the volume at `/app/data`. Same optional `AGENT_*` at run.

## Railway

Build from this Dockerfile, not Nixpacks. Attach one volume and mount it at `/app/data`. No required variables. Same optional `AGENT_*`.
