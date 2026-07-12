'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import { requireRole, getInternalApiHeaders } from '@/lib/auth-context'

const EventClientSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().regex(/^\d{10,15}$/, 'Telefone inválido — apenas dígitos, 10 a 15 caracteres'),
  email: z.string().email('Email inválido'),
  description: z.string().max(500).optional().or(z.literal('')),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  digestDayOfWeek: z.coerce.number().int().min(0).max(6).default(1),
  digestDayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
  timezone: z.string().min(1),
})

async function getVerifiedTenantId(): Promise<string> {
  const session = await requireRole(['TENANT_USER'])
  if (!session.user.tenantId) throw new Error('Conta sem cliente associado')
  return session.user.tenantId
}

async function callSchedulerApi(path: string, method: string, body?: unknown) {
  const apiUrl = process.env['INTERNAL_API_URL'] ?? 'http://localhost:3001'
  const headers = await getInternalApiHeaders()
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) console.error(`[scheduler-api] ${method} ${path} → ${res.status}`)
}

export async function createEventClientAction(formData: FormData) {
  const tenantId = await getVerifiedTenantId()

  const parsed = EventClientSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    description: formData.get('description'),
    digestTime: formData.get('digestTime'),
    timezone: formData.get('timezone'),
  })
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos')

  const { digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone } = parsed.data

  const ec = await prisma.eventClient.create({
    data: { tenantId, ...parsed.data, description: parsed.data.description ?? '' },
  })

  await callSchedulerApi(`/internal/scheduler/event-client/${ec.id}`, 'POST', {
    digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth,
  })

  revalidatePath('/dashboard/tenant/casais')
}

export async function updateEventClientAction(eventClientId: string, formData: FormData) {
  const tenantId = await getVerifiedTenantId()

  const parsed = EventClientSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    description: formData.get('description'),
    digestTime: formData.get('digestTime'),
    timezone: formData.get('timezone'),
  })
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos')

  const existing = await prisma.eventClient.findUniqueOrThrow({ where: { id: eventClientId, tenantId } })

  await prisma.eventClient.update({
    where: { id: eventClientId },
    data: { ...parsed.data, description: parsed.data.description ?? '' },
  })

  const { digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone } = parsed.data

  const scheduleChanged =
    digestTime !== existing.digestTime ||
    timezone !== existing.timezone ||
    digestFrequency !== existing.digestFrequency ||
    digestDayOfWeek !== existing.digestDayOfWeek ||
    digestDayOfMonth !== existing.digestDayOfMonth

  if (scheduleChanged) {
    await callSchedulerApi(`/internal/scheduler/event-client/${eventClientId}`, 'POST', {
      digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth,
    })
  }

  revalidatePath('/dashboard/tenant/casais')
}

export async function deleteEventClientAction(eventClientId: string) {
  const tenantId = await getVerifiedTenantId()
  await prisma.eventClient.deleteMany({ where: { id: eventClientId, tenantId } })
  await callSchedulerApi(`/internal/scheduler/event-client/${eventClientId}`, 'DELETE')
  revalidatePath('/dashboard/tenant/casais')
}

export async function linkGroupToEventClientAction(groupId: string, eventClientId: string | null) {
  const tenantId = await getVerifiedTenantId()
  await prisma.waGroup.updateMany({
    where: { id: groupId, tenantId },
    data: { eventClientId },
  })
  revalidatePath('/dashboard/tenant/grupos')
  revalidatePath('/dashboard/tenant/casais')
}
