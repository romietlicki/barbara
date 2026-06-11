import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { QrConnect } from '@/components/qr-connect'

export default async function ConectarPage({ params }: { params: { id: string } }) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId!

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id, agencyId },
    select: { id: true, name: true },
  })

  if (!tenant) notFound()

  return (
    <div className="max-w-lg mx-auto">
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
        <span className="text-gray-700">Conectar WhatsApp</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Conectar WhatsApp</h1>
        <p className="text-sm text-gray-500 mb-4">
          Conecte o número <strong>{tenant.name}</strong> para monitorar grupos e enviar digests.
        </p>

        <QrConnect tenantId={tenant.id} tenantName={tenant.name} />
      </div>
    </div>
  )
}
