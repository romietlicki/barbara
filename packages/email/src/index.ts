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
    throw new Error(`[email] RESEND_API_KEY não configurado — impossível enviar para ${payload.to}`)
  }

  const from = process.env['EMAIL_FROM'] ?? 'onboarding@resend.dev'

  console.log(`[email] enviando via Resend from=${from} to=${payload.to}`)

  const { data, error } = await client.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })

  if (error) {
    throw new Error(`Resend erro: ${error.message}`)
  }

  console.log(`[email] aceito pelo Resend id=${data?.id} to=${payload.to}`)
}

export { digestFailureHtml, waDisconnectedHtml, digestEmailHtml, passwordResetHtml } from './templates'
