'use client'

import { useRouter } from 'next/navigation'
import { QrConnect } from '@/components/qr-connect'
import { DisconnectWaButton } from '@/components/disconnect-wa-button'

interface Props {
  tenantId: string
  tenantName: string
  whatsappPhone: string
}

export function TenantConnectClient({ tenantId, tenantName, whatsappPhone }: Props) {
  const router = useRouter()

  return (
    <>
      {whatsappPhone && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-green-700">
              Número atual: <strong>{whatsappPhone}</strong>
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Escanear um novo QR code substitui a conexão existente.
            </p>
          </div>
          <DisconnectWaButton tenantId={tenantId} />
        </div>
      )}

      <QrConnect
        tenantId={tenantId}
        tenantName={tenantName}
        onConnected={() => router.push('/dashboard/tenant')}
      />
    </>
  )
}
