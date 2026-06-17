FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ─── Instala dependências ─────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json          ./apps/api/
COPY packages/ai/package.json       ./packages/ai/
COPY packages/config/package.json   ./packages/config/
COPY packages/db/package.json       ./packages/db/
COPY packages/db/prisma             ./packages/db/prisma/
COPY packages/email/package.json    ./packages/email/
COPY packages/queue/package.json    ./packages/queue/
COPY packages/taskade/package.json  ./packages/taskade/
COPY packages/whatsapp/package.json ./packages/whatsapp/
RUN pnpm install --frozen-lockfile

# ─── Build ───────────────────────────────────────────────────────────────────
FROM installer AS builder
WORKDIR /repo
COPY apps/api          ./apps/api/
COPY packages/ai       ./packages/ai/
COPY packages/config   ./packages/config/
COPY packages/db       ./packages/db/
COPY packages/email    ./packages/email/
COPY packages/queue    ./packages/queue/
COPY packages/taskade  ./packages/taskade/
COPY packages/whatsapp ./packages/whatsapp/

RUN pnpm --filter @repo/db generate

# ─── Runner ──────────────────────────────────────────────────────────────────
# Usa tsx em runtime para evitar problemas de resolução de workspace packages
# no processo de compilação multi-stage. Aceitável para serviço Node.js deste porte.
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 fastify

COPY --from=builder --chown=fastify:nodejs /repo/node_modules         ./node_modules
COPY --from=builder --chown=fastify:nodejs /repo/apps/api/src         ./apps/api/src
COPY --from=builder --chown=fastify:nodejs /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=fastify:nodejs /repo/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder --chown=fastify:nodejs /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=fastify:nodejs /repo/packages             ./packages
COPY --from=builder --chown=fastify:nodejs /repo/package.json         ./package.json
COPY --from=builder --chown=fastify:nodejs /repo/pnpm-workspace.yaml  ./pnpm-workspace.yaml

USER fastify
EXPOSE 3001
CMD ["sh", "-c", "packages/db/node_modules/.bin/prisma migrate deploy --schema=packages/db/prisma/schema.prisma && apps/api/node_modules/.bin/tsx apps/api/src/index.ts"]
