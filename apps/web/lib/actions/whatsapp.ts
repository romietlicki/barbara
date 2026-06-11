'use server'

import { prisma } from '@repo/db'
import { EvolutionApiClient } from '@repo/whatsapp'
import { requireRole } from '@/lib/auth-context'

async function resolveTenant(callerTenantId: string) {
  const session = await requireRole(['AGENCY_ADMIN', 'TENANT_USER'])

  if (session.user.role === 'AGENCY_ADMIN') {
    const agencyId = session.user.agencyId!
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: callerTenantId, agencyId },
    })
    return { tenant, agencyId }
  }

  // TENANT_USER — ignora o parâmetro, usa o tenantId da sessão (sem risco de impersonation)
  const tenantId = session.user.tenantId
  const agencyId = session.user.agencyId
  if (!tenantId || !agencyId) throw new Error('Conta sem cliente associado')

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })
  return { tenant, agencyId }
}

export async function connectWhatsAppAction(
  tenantId: string,
): Promise<{ qrBase64: string | null; status: string }> {
  const { tenant, agencyId } = await resolveTenant(tenantId)

  const client = new EvolutionApiClient()

  const webhookBaseUrl = process.env['EVOLUTION_WEBHOOK_BASE_URL'] ?? 'http://api:3001'
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } })
  const webhookUrl = `${webhookBaseUrl}/webhooks/wa/${agency.slug}`
  const webhookSecret = process.env['EVOLUTION_WEBHOOK_SECRET'] ?? ''

  try {
    await client.createInstance(tenant.id, webhookUrl, webhookSecret)
  } catch {
    // instância já existe — tenta buscar QR mesmo assim
  }

  try {
    const qr = await client.getQrCode(tenant.id)
    return { qrBase64: qr.base64, status: 'connecting' }
  } catch {
    const statusData = await client.getStatus(tenant.id)
    return { qrBase64: null, status: statusData.state }
  }
}

export async function disconnectWhatsAppAction(tenantId: string): Promise<void> {
  const { tenant } = await resolveTenant(tenantId)

  const client = new EvolutionApiClient()
  try {
    await client.logoutInstance(tenant.id)
  } catch {
    // instância pode não existir ou já estar desconectada
  }
}

export async function getWaStatusAction(
  tenantId: string,
): Promise<{ state: 'open' | 'connecting' | 'close' }> {
  const { tenant } = await resolveTenant(tenantId)

  const client = new EvolutionApiClient()
  try {
    const data = await client.getStatus(tenant.id)
    return { state: data.state }
  } catch {
    return { state: 'close' }
  }
}
