import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import type { Role } from '@repo/db'

// Factory que retorna um preHandler Fastify para verificação de role
export function requireRole(
  allowedRoles: Role[],
): (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) => void {
  return (request, reply, done) => {
    const { auth } = request

    if (!auth) {
      reply.status(401).send({ error: 'Unauthorized' })
      return
    }

    if (!allowedRoles.includes(auth.role)) {
      reply.status(403).send({ error: 'Forbidden', required: allowedRoles })
      return
    }

    done()
  }
}

// Garante que o contexto pertence à agência correta (evita IDOR entre agências)
export function requireAgencyAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  const agencyIdParam = (request.params as Record<string, string>)['agencyId']

  if (agencyIdParam && request.auth?.agencyId !== agencyIdParam) {
    if (request.auth?.role !== 'SUPER_ADMIN') {
      reply.status(403).send({ error: 'Forbidden: agency mismatch' })
      return
    }
  }

  done()
}

// Garante que o contexto pertence ao tenant correto (evita IDOR entre tenants)
export function requireTenantAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  const tenantIdParam = (request.params as Record<string, string>)['tenantId']

  if (
    tenantIdParam &&
    request.auth?.tenantId !== tenantIdParam &&
    request.auth?.role !== 'SUPER_ADMIN' &&
    request.auth?.role !== 'AGENCY_ADMIN'
  ) {
    reply.status(403).send({ error: 'Forbidden: tenant mismatch' })
    return
  }

  done()
}
