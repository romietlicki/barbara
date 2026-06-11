import { requireAuth } from '@/lib/auth-context'
import { redirect } from 'next/navigation'

// Ponto de entrada do dashboard — redireciona para a view correta por role
export default async function DashboardPage() {
  const session = await requireAuth()

  switch (session.user.role) {
    case 'SUPER_ADMIN':
      redirect('/dashboard/admin')
    case 'AGENCY_ADMIN':
      redirect('/dashboard/agency')
    case 'TENANT_USER':
      redirect('/dashboard/tenant')
  }
}
