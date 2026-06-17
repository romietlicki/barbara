import { Resend } from 'resend'

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (_resend) return _resend
  const apiKey = process.env['RESEND_API_KEY']
  if (!apiKey) return null
  _resend = new Resend(apiKey)
  return _resend
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const client = getResend()
  if (!client) {
    console.warn(`[email] RESEND_API_KEY não configurado — email NÃO enviado para ${payload.to}`)
    return
  }

  const from = process.env['EMAIL_FROM'] ?? 'onboarding@resend.dev'

  const { error } = await client.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })

  if (error) {
    throw new Error(`Resend: ${error.message}`)
  }
}

export { digestFailureHtml, waDisconnectedHtml, digestEmailHtml, passwordResetHtml } from './templates'
