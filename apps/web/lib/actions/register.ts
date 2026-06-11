'use server'

import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'

const RegisterSchema = z.object({
  firstName: z.string().min(2, 'Nome obrigatório'),
  lastName: z.string().min(2, 'Sobrenome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\d{10,15}$/, 'Telefone inválido — apenas dígitos, 10 a 15 caracteres'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'As senhas não coincidem.',
  path: ['confirm'],
})

function buildSlug(firstName: string, lastName: string): string {
  const base = `${firstName}${lastName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)
  const suffix = crypto.randomBytes(3).toString('hex') // 6 chars
  return `${base}-${suffix}`
}

export async function registerAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const raw = RegisterSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })

  if (!raw.success) {
    const msg = raw.error.errors[0]?.message ?? 'Dados inválidos'
    return { error: msg }
  }

  const { firstName, lastName, email, phone, password } = raw.data
  const fullName = `${firstName} ${lastName}`

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return { error: 'Este email já está cadastrado.' }

  const hash = await bcrypt.hash(password, 12)
  const slug = buildSlug(firstName, lastName)

  await prisma.$transaction(async (tx) => {
    const agency = await tx.agency.create({
      data: {
        name: fullName,
        slug,
        planStatus: 'TRIAL',
      },
    })

    await tx.user.create({
      data: {
        email,
        name: fullName,
        phone,
        passwordHash: hash,
        role: 'AGENCY_ADMIN',
        agencyId: agency.id,
      },
    })
  })

  return { success: true }
}

