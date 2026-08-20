# Multi-stage image for Railway. Bun for install/build; standalone output
# at runtime. Pattern follows the official Next.js with-docker Bun example:
# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile.bun

FROM oven/bun:1 AS dependencies

WORKDIR /app

COPY package.json bun.lock* ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --no-save --frozen-lockfile

FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Auth.js reads AUTH_SECRET when the config module loads during `next build`.
# Runtime must set a real secret. This value is not used for cookies in prod.
ENV AUTH_SECRET=build-time-placeholder
ENV AUTH_TRUST_HOST=true

RUN bun run build

FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=bun:bun /app/public ./public

RUN mkdir .next && chown bun:bun .next

COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

USER bun

EXPOSE 3000

CMD ["bun", "server.js"]
