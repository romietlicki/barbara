import type {
  EvolutionWebhookPayload,
  EvolutionMessageContent,
  ParsedWhatsAppMessage,
} from './types'

// Extrai texto de vários messageTypes da Evolution API.
// Retorna null para tipos sem conteúdo textual relevante para digest.
function extractText(
  messageType: string,
  message: EvolutionMessageContent | undefined,
): string | null {
  if (!message) return null

  switch (messageType) {
    case 'conversation':
      return message.conversation ?? null
    case 'extendedTextMessage':
      return message.extendedTextMessage?.text ?? null
    case 'imageMessage':
      return message.imageMessage?.caption ?? null
    case 'videoMessage':
      return message.videoMessage?.caption ?? null
    default:
      // Áudio, sticker, reação, documento sem caption → irrelevante para digest
      return null
  }
}

// Retorna null para payloads que não devem gerar Message no banco:
//   - eventos que não são mensagens novas
//   - mensagens enviadas pelo próprio número (@fromMe)
//   - mensagens privadas (não @g.us)
//   - mensagens sem conteúdo textual extraível
export function parseWebhookPayload(
  payload: EvolutionWebhookPayload,
): ParsedWhatsAppMessage | null {
  if (payload.event !== 'messages.upsert') return null

  const { key, message, messageType, messageTimestamp, pushName } = payload.data

  if (key.fromMe) return null
  if (!key.remoteJid.endsWith('@g.us')) return null

  const content = extractText(messageType, message)
  if (!content?.trim()) return null

  // Em grupos, o remetente é o participant; sender é o número da instância
  const senderJid = key.participant ?? payload.sender ?? ''
  const authorPhone = senderJid.split('@')[0] ?? 'unknown'

  return {
    waMessageId: key.id,
    waGroupId: key.remoteJid,
    author: pushName?.trim() || authorPhone,
    authorPhone,
    content: content.trim(),
    timestamp: new Date(messageTimestamp * 1000),
  }
}
