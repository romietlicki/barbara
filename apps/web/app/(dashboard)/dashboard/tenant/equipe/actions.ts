'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import { requireRole } from '@/lib/auth-context'
import bcrypt from 'bcryptjs'

const CreateViewerSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha mínima de 6 caracteres'),
})

export async function createViewerAction(formData: FormData) {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId, agencyId } = session.user
  if (!tenantId) throw new Error('Conta sem cliente associado')

  const parsed = CreateViewerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos')

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) throw new Error(`O email ${email} já está em uso`)

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: { name, email, passwordHash, role: 'TENANT_VIEWER', tenantId, agencyId: agencyId ?? null },
  })

  revalidatePath('/dashboard/tenant/equipe')
}

export async function deleteViewerAction(userId: string) {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user
  if (!tenantId) throw new Error('Conta sem cliente associado')

  const viewer = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { tenantId: true, role: true },
  })

  if (viewer.tenantId !== tenantId || viewer.role !== 'TENANT_VIEWER') {
    throw new Error('Usuário não encontrado nesta conta')
  }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/dashboard/tenant/equipe')
}
