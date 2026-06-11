// Tipos do payload de webhook da Evolution API v2

export type EvolutionEventType =
  | 'messages.upsert'
  | 'messages.update'
  | 'messages.delete'
  | 'connection.update'
  | 'qrcode.updated'
  | 'groups.upsert'
  | 'groups.update'
  | (string & {}) // outros eventos futuros

export interface EvolutionMessageKey {
  remoteJid: string   // grupo @g.us ou contato @s.whatsapp.net
  fromMe: boolean
  id: string          // ID único da mensagem (dedup key)
  participant?: string // remetente em mensagens de grupo (@s.whatsapp.net)
}

export interface EvolutionMessageContent {
  conversation?: string
  extendedTextMessage?: { text: string; contextInfo?: unknown }
  imageMessage?: { caption?: string; mimetype: string }
  videoMessage?: { caption?: string; mimetype: string }
  audioMessage?: { seconds: number; mimetype: string }
  documentMessage?: { title?: string; fileName?: string; mimetype: string }
  stickerMessage?: { isAnimated: boolean }
  reactionMessage?: { text: string; key: EvolutionMessageKey }
  [key: string]: unknown
}

export interface EvolutionWebhookData {
  key: EvolutionMessageKey
  message?: EvolutionMessageContent
  messageType: string
  messageTimestamp: number
  pushName: string
  broadcast?: boolean
  status?: string
}

export interface EvolutionWebhookPayload {
  event: EvolutionEventType
  instance: string
  data: EvolutionWebhookData
  date_time: string
  sender: string
  server_url: string
  apikey: string
}

// Tipos de resposta da Evolution API HTTP client

export interface InstanceStatus {
  instanceName: string
  state: 'open' | 'connecting' | 'close'
}

export interface QrCodeResponse {
  code: string
  base64: string
}

export interface SendMessageResponse {
  key: { remoteJid: string; fromMe: boolean; id: string }
  status: string
}

// Mensagem já normalizada para o nosso domínio
export interface ParsedWhatsAppMessage {
  waMessageId: string
  waGroupId: string    // remoteJid (@g.us)
  author: string       // pushName ou telefone
  authorPhone: string  // número sem @s.whatsapp.net
  content: string      // texto extraído
  timestamp: Date
}
