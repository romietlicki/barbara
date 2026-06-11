'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import { requireRole } from '@/lib/auth-context'

export async function toggleGroupActiveAction(groupId: string, tenantId: string) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId!

  // Verifica que o tenant pertence a esta agência antes de alterar o grupo
  const group = await prisma.waGroup.findUniqueOrThrow({
    where: { id: groupId },
    include: { tenant: { select: { agencyId: true } } },
  })

  if (group.tenant.agencyId !== agencyId) {
    throw new Error('Acesso negado')
  }

  await prisma.waGroup.update({
    where: { id: groupId },
    data: { isActive: !group.isActive },
  })

  revalidatePath(`/dashboard/agency/clientes/${tenantId}/grupos`)
}
