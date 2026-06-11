import type { Role } from '@repo/db'

// Contexto de autenticação injetado em request.auth após verificação
export interface AuthContext {
  userId: string
  role: Role
  agencyId: string | null
  tenantId: string | null
}

// Augment do Fastify para tipagem do request.auth em toda a aplicação
declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext
  }
}
