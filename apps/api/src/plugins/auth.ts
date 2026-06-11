import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import type { Role } from '@repo/db'
import type { AuthContext } from '../types/index.js'

// Rotas que não requerem o token interno (webhook usa HMAC próprio)
const UNAUTHENTICATED_PREFIXES = ['/webhooks/', '/health']

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auth', null)

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const isPublic = UNAUTHENTICATED_PREFIXES.some((prefix) =>
      request.url.startsWith(prefix),
    )
    if (isPublic) return

    const token = request.headers['x-internal-api-key']
    if (!token || token !== process.env['INTERNAL_API_KEY']) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    // Next.js server actions passam o contexto do usuário autenticado via headers
    // Isso é seguro pois apenas o servidor Next.js conhece o INTERNAL_API_KEY
    const userId = request.headers['x-user-id']
    const role = request.headers['x-user-role'] as Role | undefined
    const agencyId = request.headers['x-agency-id'] ?? null
    const tenantId = request.headers['x-tenant-id'] ?? null

    if (!userId || !role) {
      return reply.status(401).send({ error: 'Missing user context headers' })
    }

    const ctx: AuthContext = {
      userId: userId as string,
      role,
      agencyId: agencyId as string | null,
      tenantId: tenantId as string | null,
    }

    request.auth = ctx
  })
}

export default fp(authPlugin, { name: 'auth' })
