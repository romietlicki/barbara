'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'
import { requireRole, getInternalApiHeaders } from '@/lib/auth-context'

const DigestScheduleSchema = z.object({
  digestTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  digestDayOfWeek: z.coerce.number().int().min(0).max(6).default(1),
  digestDayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
  timezone: z.string().min(1),
})

const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email obrigatório'),
  whatsappPhone: z.string().regex(/^\d*$/, 'Apenas dígitos').optional().or(z.literal('')),
}).merge(DigestScheduleSchema)

async function callInternalApi(path: string, method: string, body?: unknown) {
  const apiUrl = process.env['INTERNAL_API_URL'] ?? 'http://localhost:3001'
  const headers = await getInternalApiHeaders()
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    console.error(`[internal-api] ${method} ${path} → ${res.status}`)
  }
}

export async function createTenantAction(formData: FormData) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId
  if (!agencyId) throw new Error('Usuário sem agência associada')

  const parsed = CreateTenantSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    whatsappPhone: formData.get('whatsappPhone'),
    digestTime: formData.get('digestTime'),
    timezone: formData.get('timezone'),
  })

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    throw new Error(Object.values(errors).flat()[0] ?? 'Dados inválidos')
  }

  const { name, email, whatsappPhone = '', digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone } = parsed.data

  const tenant = await prisma.tenant.create({
    data: { agencyId, name, email, whatsappPhone, digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone },
  })

  // Cria ou atualiza conta de acesso — usuário redefine senha via "Esqueci a Senha"
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    if (existingUser.role !== 'TENANT_USER') {
      throw new Error(`O email ${email} já pertence a uma conta de ${existingUser.role === 'AGENCY_ADMIN' ? 'admin de agência' : 'super admin'}. Use um email diferente para este cliente.`)
    }
    // Usuário já existe como TENANT_USER — garante que tenantId está vinculado
    await prisma.user.update({
      where: { email },
      data: { tenantId: tenant.id, agencyId },
    })
  } else {
    const tempPass = whatsappPhone.length >= 8 ? whatsappPhone.slice(-8) : 'Barbara@1234'
    const hash = await bcrypt.hash(tempPass, 12)
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hash,
        role: 'TENANT_USER',
        agencyId,
        tenantId: tenant.id,
      },
    })
  }

  await callInternalApi(`/internal/scheduler/${tenant.id}`, 'POST', { digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth })

  revalidatePath('/dashboard/agency/clientes')
  return { id: tenant.id }
}

const UpdateTenantSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email obrigatório'),
  whatsappPhone: z.string().regex(/^\d*$/, 'Apenas dígitos').optional().or(z.literal('')),
}).merge(DigestScheduleSchema)

export async function updateTenantAction(tenantId: string, formData: FormData) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId
  if (!agencyId) throw new Error('Usuário sem agência associada')

  const parsed = UpdateTenantSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    whatsappPhone: formData.get('whatsappPhone'),
    digestTime: formData.get('digestTime'),
    timezone: formData.get('timezone'),
  })

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    throw new Error(Object.values(errors).flat()[0] ?? 'Dados inválidos')
  }

  const existing = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId, agencyId },
  })

  const { name, email, digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone, whatsappPhone } = parsed.data

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name, email, digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone,
      ...(whatsappPhone !== undefined && whatsappPhone !== '' ? { whatsappPhone } : {}),
    },
  })

  const scheduleChanged =
    digestTime !== existing.digestTime ||
    timezone !== existing.timezone ||
    digestFrequency !== existing.digestFrequency ||
    digestDayOfWeek !== existing.digestDayOfWeek ||
    digestDayOfMonth !== existing.digestDayOfMonth

  if (scheduleChanged) {
    await callInternalApi(`/internal/scheduler/${tenantId}`, 'POST', {
      digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth,
    })
  }

  revalidatePath(`/dashboard/agency/clientes/${tenantId}`)
  revalidatePath('/dashboard/agency/clientes')
}

export async function deleteTenantAction(tenantId: string) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId
  if (!agencyId) throw new Error('Usuário sem agência associada')

  await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId, agencyId } })

  await callInternalApi(`/internal/scheduler/${tenantId}`, 'DELETE')

  await prisma.tenant.delete({ where: { id: tenantId } })

  revalidatePath('/dashboard/agency/clientes')
}

export async function toggleTenantActiveAction(tenantId: string) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId
  if (!agencyId) throw new Error('Usuário sem agência associada')

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId, agencyId },
  })

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: !tenant.isActive },
  })

  if (tenant.isActive) {
    await callInternalApi(`/internal/scheduler/${tenantId}`, 'DELETE')
  } else {
    await callInternalApi(`/internal/scheduler/${tenantId}`, 'POST', {
      digestTime: tenant.digestTime,
      timezone: tenant.timezone,
    })
  }

  revalidatePath('/dashboard/agency/clientes')
}
