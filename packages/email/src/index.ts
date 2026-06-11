import nodemailer from 'nodemailer'

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

let _transporter: nodemailer.Transporter | undefined

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter

  _transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'smtp.resend.com',
    port: Number(process.env['SMTP_PORT'] ?? 465),
    secure: Number(process.env['SMTP_PORT'] ?? 465) === 465,
    auth: {
      user: process.env['SMTP_USER'] ?? 'resend',
      pass: process.env['SMTP_PASS'] ?? '',
    },
  })

  return _transporter
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const from = process.env['EMAIL_FROM'] ?? 'noreply@barbara.app'

  if (!process.env['SMTP_PASS']) {
    console.warn(`[email] SMTP_PASS não configurado — email NÃO enviado para ${payload.to}`)
    return
  }

  await getTransporter().sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })
}

export { digestFailureHtml, waDisconnectedHtml, digestEmailHtml, passwordResetHtml } from './templates'
