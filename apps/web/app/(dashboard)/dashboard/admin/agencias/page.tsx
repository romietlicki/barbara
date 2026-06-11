import Link from 'next/link'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'

const PLAN_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  TRIAL:    { label: 'Trial',     variant: 'warning' },
  ACTIVE:   { label: 'Ativo',     variant: 'success' },
  PAST_DUE: { label: 'Atrasado',  variant: 'destructive' },
  CANCELED: { label: 'Cancelado', variant: 'secondary' },
}

export default async function AdminAgenciasPage() {
  await requireRole(['SUPER_ADMIN'])

  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { tenants: true, users: true } },
    },
  })

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agências</h1>
          <p className="text-sm text-gray-500 mt-1">{agencies.length} agência(s) cadastrada(s)</p>
        </div>
      </div>

      {agencies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500">Nenhuma agência cadastrada ainda.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Agência</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Clientes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Usuários</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Plano</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agencies.map((agency) => {
                const plan = PLAN_LABELS[agency.planStatus] ?? PLAN_LABELS['TRIAL']!
                return (
                  <tr key={agency.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{agency.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(agency.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                      {agency.slug}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {agency._count.tenants}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {agency._count.users}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.variant}>{plan.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/agencias/${agency.id}`}
                        className="inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:underline"
                      >
                        Detalhes <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
