import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Mail, Phone } from 'lucide-react'
import { EventClientDialog } from './_components/event-client-dialog'
import { DeleteEventClientButton } from './_components/delete-event-client-button'

export default async function CasaisPage() {
  const session = await requireRole(['TENANT_USER', 'TENANT_VIEWER'])
  const { tenantId } = session.user
  const isViewer = session.user.role === 'TENANT_VIEWER'

  if (!tenantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <p className="text-sm text-yellow-800">Conta sem cliente associado.</p>
      </div>
    )
  }

  const eventClients = await prisma.eventClient.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { groups: true } } },
  })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Casais / Eventos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {eventClients.length} casal(is) cadastrado(s) — cada casal recebe seu próprio digest
          </p>
        </div>
        {!isViewer && <EventClientDialog mode="create" />}
      </div>

      {eventClients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500 mb-2">Nenhum casal cadastrado ainda.</p>
          <p className="text-sm text-gray-400">
            Cadastre os casais e vincule cada um ao grupo do WhatsApp correspondente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventClients.map((ec) => (
            <div
              key={ec.id}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-semibold text-gray-900 text-base">{ec.name}</h2>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {ec._count.groups} grupo(s)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {ec.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {ec.phone}
                    </span>
                  </div>

                  {ec.description && (
                    <p className="text-sm text-gray-400 italic truncate">{ec.description}</p>
                  )}
                </div>

                {!isViewer && (
                  <div className="flex gap-2 shrink-0">
                    <EventClientDialog
                      mode="edit"
                      defaultValues={{
                        id: ec.id,
                        name: ec.name,
                        phone: ec.phone,
                        email: ec.email,
                        description: ec.description,
                        digestTime: ec.digestTime,
                        digestFrequency: ec.digestFrequency,
                        digestDayOfWeek: ec.digestDayOfWeek,
                        digestDayOfMonth: ec.digestDayOfMonth,
                        timezone: ec.timezone,
                      }}
                    />
                    <DeleteEventClientButton eventClientId={ec.id} name={ec.name} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
