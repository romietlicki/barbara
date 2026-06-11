import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { ToggleGroupButton } from './_components/toggle-group-button'

export default async function GruposPage({ params }: { params: { id: string } }) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId!

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id, agencyId },
    include: {
      groups: {
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: { _count: { select: { messages: true } } },
      },
    },
  })

  if (!tenant) notFound()

  const activeCount = tenant.groups.filter((g) => g.isActive).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/agency/clientes" className="hover:text-gray-600">
          Clientes
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/agency/clientes/${tenant.id}`}
          className="hover:text-gray-600"
        >
          {tenant.name}
        </Link>
        <span>/</span>
        <span className="text-gray-700">Grupos</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos monitorados</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} de {tenant.groups.length} grupo(s) ativo(s)
          </p>
        </div>
      </div>

      {tenant.groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500 mb-2">Nenhum grupo detectado ainda.</p>
          <p className="text-sm text-gray-400">
            Após conectar o WhatsApp, envie uma mensagem de teste em um grupo monitorado. O grupo
            será registrado automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Grupo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                  Mensagens
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenant.groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">{group.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                      {group.waGroupId}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {group._count.messages}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={group.isActive ? 'success' : 'secondary'}>
                      {group.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ToggleGroupButton
                      groupId={group.id}
                      tenantId={tenant.id}
                      isActive={group.isActive}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Apenas grupos ativos são incluídos no digest diário.
      </p>
    </div>
  )
}
