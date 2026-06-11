import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'

export default async function AdminDashboardPage() {
  await requireRole(['SUPER_ADMIN'])

  const [agencyCount, tenantCount, userCount] = await Promise.all([
    prisma.agency.count(),
    prisma.tenant.count(),
    prisma.user.count(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Visão Geral — Plataforma
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Agências" value={agencyCount} />
        <StatCard label="Clientes (Tenants)" value={tenantCount} />
        <StatCard label="Usuários" value={userCount} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between">
        <p className="text-sm text-gray-700 font-medium">Gerenciar agências, planos e usuários</p>
        <a
          href="/dashboard/admin/agencias"
          className="text-sm text-[var(--brand)] hover:underline font-medium"
        >
          Ver agências →
        </a>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
