import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { PlanSelect } from './_components/plan-select'
import { DeleteAgencyButton } from './_components/delete-agency-button'

const PLAN_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  TRIAL:    { label: 'Trial',     variant: 'warning' },
  ACTIVE:   { label: 'Ativo',     variant: 'success' },
  PAST_DUE: { label: 'Atrasado',  variant: 'destructive' },
  CANCELED: { label: 'Cancelado', variant: 'secondary' },
}

export default async function AdminAgenciaDetailPage({ params }: { params: { id: string } }) {
  await requireRole(['SUPER_ADMIN'])

  const agency = await prisma.agency.findUnique({
    where: { id: params.id },
    include: {
      tenants: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { groups: true, messages: true } } },
      },
      users: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      },
    },
  })

  if (!agency) notFound()

  const plan = PLAN_LABELS[agency.planStatus] ?? PLAN_LABELS['TRIAL']!

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/admin" className="hover:text-gray-600">Admin</Link>
        <span>/</span>
        <Link href="/dashboard/admin/agencias" className="hover:text-gray-600">Agências</Link>
        <span>/</span>
        <span className="text-gray-700">{agency.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{agency.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-1">slug: {agency.slug}</p>
          <p className="text-xs text-gray-400 mt-1">
            Criada em {new Date(agency.createdAt).toLocaleDateString('pt-BR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <DeleteAgencyButton agencyId={agency.id} agencyName={agency.name} />
      </div>

      {/* Plano */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Status do plano</p>
            <Badge variant={plan.variant}>{plan.label}</Badge>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-gray-400">Alterar plano</p>
            <PlanSelect agencyId={agency.id} current={agency.planStatus} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Clientes', value: agency.tenants.length },
          { label: 'Usuários', value: agency.users.length },
          { label: 'Grupos ativos', value: agency.tenants.reduce((acc, t) => acc + t._count.groups, 0) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clientes */}
      <section className="bg-white border border-gray-200 rounded-xl mb-4">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Clientes</h2>
        </div>
        {agency.tenants.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum cliente cadastrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {agency.tenants.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.email || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t._count.groups} grupos</p>
                  <p className="text-xs text-gray-400">{t._count.messages} msgs</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Usuários */}
      <section className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Usuários</h2>
        </div>
        {agency.users.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum usuário.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {agency.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <Badge variant={u.role === 'AGENCY_ADMIN' ? 'secondary' : 'default'}>
                  {u.role === 'AGENCY_ADMIN' ? 'Admin' : 'Cliente'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
