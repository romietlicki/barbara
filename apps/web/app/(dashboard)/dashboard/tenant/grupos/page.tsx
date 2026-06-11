import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { TenantToggleGroupButton } from './_components/toggle-group-button'
import { LinkEventClientSelect } from './_components/link-event-client-select'

export default async function TenantGruposPage() {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user

  if (!tenantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <p className="text-sm text-yellow-800">Conta sem cliente associado.</p>
      </div>
    )
  }

  const [groups, eventClients] = await Promise.all([
    prisma.waGroup.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { messages: true } },
        eventClient: { select: { id: true, name: true } },
      },
    }),
    prisma.eventClient.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const activeCount = groups.filter((g) => g.isActive).length

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grupos monitorados</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeCount} de {groups.length} grupo(s) ativo(s) — apenas grupos ativos entram no digest
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500 mb-2">Nenhum grupo detectado ainda.</p>
          <p className="text-sm text-gray-400">
            Após o WhatsApp ser conectado e uma mensagem ser recebida, o grupo aparece aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Grupo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Casal vinculado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Msgs</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[160px]">
                      {group.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-[160px]">
                      {group.waGroupId}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <LinkEventClientSelect
                      groupId={group.id}
                      currentEventClientId={group.eventClientId}
                      options={eventClients}
                    />
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
                    <TenantToggleGroupButton groupId={group.id} isActive={group.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {eventClients.length === 0 && groups.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Cadastre casais em <strong>Casais / Eventos</strong> para vincular cada grupo a um evento.
        </p>
      )}
    </div>
  )
}
