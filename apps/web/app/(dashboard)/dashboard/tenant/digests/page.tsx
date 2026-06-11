import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'

export default async function TenantDigestsPage() {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user

  if (!tenantId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <p className="text-sm text-yellow-800">
          Conta sem cliente associado. Entre em contato com sua agência.
        </p>
      </div>
    )
  }

  const digests = await prisma.digest.findMany({
    where: { tenantId },
    orderBy: { date: 'desc' },
    take: 30,
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meus digests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Histórico dos últimos {digests.length} digest(s) gerado(s)
        </p>
      </div>

      {digests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500 mb-2">Nenhum digest gerado ainda.</p>
          <p className="text-sm text-gray-400">
            Os digests são gerados automaticamente no horário configurado pela sua agência.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {digests.map((digest) => (
            <details
              key={digest.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden group"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors list-none">
                <div>
                  <p className="font-semibold text-gray-900">
                    {new Date(digest.date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {digest.sentAt
                      ? `Enviado às ${new Date(digest.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Não enviado'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={digest.sentAt ? 'success' : 'warning'}>
                    {digest.sentAt ? 'Enviado' : 'Pendente'}
                  </Badge>
                  <svg
                    className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>

              <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                  {digest.contentMd}
                </pre>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
