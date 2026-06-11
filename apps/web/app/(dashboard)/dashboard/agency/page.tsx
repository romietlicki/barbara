import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

export default async function AgencyDashboardPage() {
  const session = await requireRole(['AGENCY_ADMIN'])
  const { agencyId } = session.user

  if (!agencyId) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
        <p className="text-sm text-yellow-800">
          Conta sem agência associada. Entre em contato com o suporte.
        </p>
      </div>
    )
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const [tenants, agency, digestsToday, tenantCount] = await Promise.all([
    prisma.tenant.findMany({
      where: { agencyId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.agency.findUnique({ where: { id: agencyId } }),
    prisma.digest.count({
      where: {
        tenant: { agencyId },
        sentAt: { gte: today },
      },
    }),
    prisma.tenant.count({ where: { agencyId } }),
  ])

  // Onboarding: redireciona para wizard se não há nenhum cliente cadastrado
  if (tenantCount === 0) redirect('/onboarding')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{agency?.name ?? 'Minha Agência'}</h1>
        <Badge variant={agency?.planStatus === 'ACTIVE' ? 'success' : 'warning'}>
          {agency?.planStatus ?? 'TRIAL'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Clientes ativos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{tenants.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Digests enviados hoje</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{digestsToday}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Clientes recentes</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/agency/clientes">
            Ver todos <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500 mb-3">Nenhum cliente cadastrado ainda.</p>
          <Button asChild size="sm">
            <Link href="/dashboard/agency/clientes">Cadastrar primeiro cliente</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <Link
                  href={`/dashboard/agency/clientes/${tenant.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{tenant.name}</p>
                    <p className="text-sm text-gray-400">{tenant.whatsappPhone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{tenant.digestTime}</span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
