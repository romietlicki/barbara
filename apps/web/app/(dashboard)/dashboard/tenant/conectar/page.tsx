import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { notFound } from 'next/navigation'
import { TenantConnectClient } from './_components/tenant-connect-client'

export default async function TenantConectarPage() {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user

  if (!tenantId) notFound()

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, whatsappPhone: true },
  })

  if (!tenant) notFound()

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conectar WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-1">
          Escaneie o QR code para conectar o WhatsApp ao sistema
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <TenantConnectClient
          tenantId={tenant.id}
          tenantName={tenant.name}
          whatsappPhone={tenant.whatsappPhone}
        />
      </div>
    </div>
  )
}
