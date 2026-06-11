'use server'

import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'
import { sendEmail, passwordResetHtml } from '@repo/email'

const EXPIRES_IN_MS = 60 * 60 * 1000 // 1 hora

export async function requestPasswordResetAction(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const email = z.string().email().safeParse(formData.get('email'))
  if (!email.success) return { error: 'Email inválido.' }

  const user = await prisma.user.findUnique({
    where: { email: email.data },
    select: { id: true, name: true, email: true },
  })

  // Resposta genérica — não revelar se o email existe ou não
  if (!user) {
    return { success: 'Se este email estiver cadastrado, você receberá o link em instantes.' }
  }

  // Invalida tokens anteriores não usados
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + EXPIRES_IN_MS)

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
  const resetUrl = `${appUrl}/redefinir-senha/${token}`

  await sendEmail({
    to: user.email,
    subject: 'Redefinir senha — Barbara',
    html: passwordResetHtml(user.name, resetUrl),
  })

  return { success: 'Se este email estiver cadastrado, você receberá o link em instantes.' }
}

export async function confirmPasswordResetAction(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const token = z.string().min(1).safeParse(formData.get('token'))
  const password = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').safeParse(formData.get('password'))
  const confirm = z.string().safeParse(formData.get('confirm'))

  if (!token.success) return { error: 'Token inválido.' }
  if (!password.success) return { error: password.error.errors[0]?.message ?? 'Senha inválida.' }
  if (!confirm.success || confirm.data !== password.data) return { error: 'As senhas não coincidem.' }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: token.data },
    include: { user: true },
  })

  if (!resetToken) return { error: 'Link inválido ou expirado.' }
  if (resetToken.usedAt) return { error: 'Este link já foi utilizado.' }
  if (resetToken.expiresAt < new Date()) return { error: 'Link expirado. Solicite um novo.' }

  const hash = await bcrypt.hash(password.data, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: hash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  return { success: 'Senha redefinida com sucesso! Você já pode fazer login.' }
}
