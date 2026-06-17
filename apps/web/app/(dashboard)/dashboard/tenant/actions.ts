'use server'

import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { sendDigestQueue } from '@repo/queue'

export async function resendDigestAction(digestId: string): Promise<void> {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user
  if (!tenantId) throw new Error('Conta sem cliente associado')

  const digest = await prisma.digest.findUnique({
    where: { id: digestId },
    select: { id: true, tenantId: true, sentAt: true },
  })

  if (!digest) throw new Error('Digest não encontrado')
  if (digest.tenantId !== tenantId) throw new Error('Sem permissão')

  // Permite reenviar mesmo que já tenha sido enviado — reseta sentAt para forçar novo envio
  await prisma.digest.update({
    where: { id: digestId },
    data: { sentAt: null },
  })

  await sendDigestQueue.add('send-digest', { tenantId, digestId })
}
