'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import { requireRole, getInternalApiHeaders } from '@/lib/auth-context'

const TaskadeSettingsSchema = z.object({
  taskadeWebhookUrl: z.string().trim().url('URL inválida').or(z.literal('')),
})

export async function updateTaskadeSettingsAction(formData: FormData) {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user
  if (!tenantId) throw new Error('Conta sem cliente associado')

  const parsed = TaskadeSettingsSchema.safeParse({
    taskadeWebhookUrl: formData.get('taskadeWebhookUrl'),
  })
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos')

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { taskadeWebhookUrl: parsed.data.taskadeWebhookUrl || null },
  })

  revalidatePath('/dashboard/tenant/configuracoes')
}

const DigestSettingsSchema = z.object({
  digestTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  digestDayOfWeek: z.coerce.number().int().min(0).max(6).default(1),
  digestDayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
  timezone: z.string().min(1),
})

export async function updateTenantDigestSettingsAction(formData: FormData) {
  const session = await requireRole(['TENANT_USER'])
  const { tenantId } = session.user
  if (!tenantId) throw new Error('Conta sem cliente associado')

  const parsed = DigestSettingsSchema.safeParse({
    digestTime: formData.get('digestTime'),
    timezone: formData.get('timezone'),
  })
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos')

  const existing = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { digestTime: true, timezone: true, digestFrequency: true, digestDayOfWeek: true, digestDayOfMonth: true },
  })

  const { digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone } = parsed.data

  await prisma.tenant.update({ where: { id: tenantId }, data: parsed.data })

  const changed =
    digestTime !== existing.digestTime ||
    timezone !== existing.timezone ||
    digestFrequency !== existing.digestFrequency ||
    digestDayOfWeek !== existing.digestDayOfWeek ||
    digestDayOfMonth !== existing.digestDayOfMonth

  if (changed) {
    const apiUrl = process.env['INTERNAL_API_URL'] ?? 'http://localhost:3001'
    const headers = await getInternalApiHeaders()
    await fetch(`${apiUrl}/internal/scheduler/${tenantId}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth }),
    })
  }

  revalidatePath('/dashboard/tenant/configuracoes')
}
