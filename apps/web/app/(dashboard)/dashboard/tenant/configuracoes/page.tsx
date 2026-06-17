import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { notFound } from 'next/navigation'
import { DigestSettingsForm } from './_components/digest-settings-form'
import { DigestEmailForm } from './_components/digest-email-form'
import { TaskadeSettingsForm } from './_components/taskade-settings-form'

export default async function ConfiguracoesPage() {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user

  if (!tenantId) notFound()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, email: true, digestTime: true, digestFrequency: true, digestDayOfWeek: true, digestDayOfMonth: true, timezone: true, taskadeWebhookUrl: true },
  })

  if (!tenant) notFound()

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-1">Digest de gestão</h2>
        <p className="text-sm text-gray-500 mb-4">
          Resumo operacional da sua empresa — grupos não vinculados a casais específicos.
        </p>
        <div className="mb-4 pb-4 border-b border-gray-100">
          <DigestEmailForm currentEmail={tenant.email} />
        </div>
        <DigestSettingsForm
          digestTime={tenant.digestTime}
          digestFrequency={tenant.digestFrequency}
          digestDayOfWeek={tenant.digestDayOfWeek}
          digestDayOfMonth={tenant.digestDayOfMonth}
          timezone={tenant.timezone}
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-700 mb-1 text-sm">Resumo por casal</h2>
        <p className="text-sm text-gray-500">
          Cada casal tem seu próprio horário de digest configurado em{' '}
          <strong>Casais / Eventos</strong>. O digest é enviado diretamente para o email do casal,
          com foco em prazos, fornecedores e aprovações do evento.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
        <h2 className="font-semibold text-gray-900 mb-1">Integração Taskade</h2>
        <p className="text-sm text-gray-500 mb-4">
          Quando configurado, cada ação gerada no digest será criada automaticamente como tarefa no
          seu projeto do Taskade, com o nível de criticidade no título.
        </p>
        <TaskadeSettingsForm taskadeWebhookUrl={tenant.taskadeWebhookUrl} />
      </div>
    </div>
  )
}
