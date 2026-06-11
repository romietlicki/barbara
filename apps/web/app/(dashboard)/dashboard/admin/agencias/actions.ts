'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import { requireRole } from '@/lib/auth-context'
import type { PlanStatus } from '@repo/db'

export async function updateAgencyPlanAction(agencyId: string, planStatus: PlanStatus) {
  await requireRole(['SUPER_ADMIN'])

  await prisma.agency.update({
    where: { id: agencyId },
    data: { planStatus },
  })

  revalidatePath('/dashboard/admin/agencias')
  revalidatePath(`/dashboard/admin/agencias/${agencyId}`)
}

export async function deleteAgencyAction(agencyId: string) {
  await requireRole(['SUPER_ADMIN'])

  // Cascata remove tenants, grupos, mensagens, digests e usuários
  await prisma.agency.delete({ where: { id: agencyId } })

  revalidatePath('/dashboard/admin/agencias')
}
