import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@repo/db'

// Retorna a sessão autenticada ou redireciona para /login.
// Use em server components de rotas protegidas.
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

// Retorna a sessão se o usuário tiver um dos roles permitidos.
// Redireciona para /dashboard (sem permissão) se o role não constar.
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard')
  }
  return session
}

// Headers para chamadas autenticadas de server actions → Fastify API
export async function getInternalApiHeaders(): Promise<Record<string, string>> {
  const session = await requireAuth()
  return {
    'x-internal-api-key': process.env['INTERNAL_API_KEY'] ?? '',
    'x-user-id': session.user.id,
    'x-user-role': session.user.role,
    'x-agency-id': session.user.agencyId ?? '',
    'x-tenant-id': session.user.tenantId ?? '',
  }
}
