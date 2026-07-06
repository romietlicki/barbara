FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ─── Instala dependências ─────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json                 ./apps/web/
COPY packages/config/package.json          ./packages/config/
COPY packages/db/package.json              ./packages/db/
COPY packages/trello/package.json          ./packages/trello/
COPY packages/whatsapp/package.json        ./packages/whatsapp/
RUN pnpm install --frozen-lockfile

# ─── Build ───────────────────────────────────────────────────────────────────
FROM installer AS builder
WORKDIR /repo
COPY apps/web                  ./apps/web/
COPY packages/config           ./packages/config/
COPY packages/db               ./packages/db/
COPY packages/trello           ./packages/trello/
COPY packages/whatsapp         ./packages/whatsapp/

RUN pnpm --filter @repo/db generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @repo/web build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone output preserva o caminho relativo a outputFileTracingRoot (/repo)
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public        ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js está em apps/web/ dentro do standalone
CMD ["node", "apps/web/server.js"]
