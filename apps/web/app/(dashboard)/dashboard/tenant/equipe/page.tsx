import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { notFound } from 'next/navigation'
import { CreateViewerDialog } from './_components/create-viewer-dialog'
import { DeleteViewerButton } from './_components/delete-viewer-button'

export default async function EquipePage() {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user

  if (!tenantId) notFound()

  const viewers = await prisma.user.findMany({
    where: { tenantId, role: 'TENANT_VIEWER' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-500 mt-1">
            Colaboradores com acesso de leitura ao painel
          </p>
        </div>
        <CreateViewerDialog />
      </div>

      {viewers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-gray-500 mb-2">Nenhum colaborador cadastrado ainda.</p>
          <p className="text-sm text-gray-400">
            Adicione colaboradores para que possam visualizar digests, grupos e casais sem permissão
            de edição.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {viewers.map((v) => (
              <li key={v.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900">{v.name}</p>
                  <p className="text-sm text-gray-400">{v.email}</p>
                </div>
                <DeleteViewerButton userId={v.id} name={v.name} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
