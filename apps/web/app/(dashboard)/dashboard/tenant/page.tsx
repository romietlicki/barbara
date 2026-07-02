import Link from 'next/link'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { EvolutionApiClient } from '@repo/whatsapp'
import { AiChat } from './_components/ai-chat'
import { ResendDigestButton } from './_components/resend-digest-button'

export default async function TenantDashboardPage() {
  const session = await requireRole(['TENANT_USER', 'TENANT_VIEWER'])
  const { tenantId } = session.user
  const isViewer = session.user.role === 'TENANT_VIEWER'

  if (!tenantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <p className="text-sm text-yellow-800">
          Conta sem cliente associado. Entre em contato com sua agência.
        </p>
      </div>
    )
  }

  const [tenant, recentDigests] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { groups: { where: { isActive: true } } } } },
    }),
    prisma.digest.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ])

  let waConnected = false
  if (tenant?.whatsappPhone) {
    try {
      const client = new EvolutionApiClient()
      const status = await client.getStatus(tenantId)
      waConnected = status.state === 'open'
    } catch {
      waConnected = false
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {tenant?.name ?? 'Meu Painel'}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Grupos monitorados</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {tenant?._count.groups ?? 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Próximo digest</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {tenant?.digestTime ?? '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">WhatsApp</p>
          {waConnected ? (
            <>
              <p className="text-sm font-semibold text-green-600 mt-1">Conectado</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{tenant?.whatsappPhone}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-400 mt-1">Não conectado</p>
              {!isViewer && (
                <Link
                  href="/dashboard/tenant/conectar"
                  className="text-xs text-[var(--brand)] hover:underline mt-0.5 inline-block"
                >
                  Conectar agora →
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat com IA */}
      <div className="mb-6">
        <AiChat />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Últimos resumos</h2>
        </div>

        {recentDigests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">Nenhum digest gerado ainda.</p>
            <p className="text-sm text-gray-400">
              Configure seus grupos de WhatsApp para receber seu primeiro digest.
            </p>
            {/* TODO: Semana 4 — botão "Configurar grupos" */}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentDigests.map((digest) => (
              <li key={digest.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(digest.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {digest.sentAt
                      ? `Enviado às ${new Date(digest.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Não enviado'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!digest.sentAt && !isViewer && <ResendDigestButton digestId={digest.id} />}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    digest.sentAt
                      ? 'bg-green-50 text-green-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {digest.sentAt ? 'Enviado' : 'Pendente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
