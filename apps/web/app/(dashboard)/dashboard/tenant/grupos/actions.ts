'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import { requireRole } from '@/lib/auth-context'

export async function tenantToggleGroupAction(groupId: string) {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user

  if (!tenantId) throw new Error('Conta sem cliente associado')

  // Garante que o grupo pertence ao tenant da sessão
  const group = await prisma.waGroup.findUniqueOrThrow({
    where: { id: groupId, tenantId },
  })

  await prisma.waGroup.update({
    where: { id: groupId },
    data: { isActive: !group.isActive },
  })

  revalidatePath('/dashboard/tenant/grupos')
}
