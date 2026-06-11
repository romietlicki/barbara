import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import type { DigestPrompt } from './prompt'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096

let _client: Anthropic | undefined

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env['ANTHROPIC_API_KEY']
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')
    _client = new Anthropic({ apiKey, maxRetries: 3 })
  }
  return _client
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

// Retorna um ReadableStream<Uint8Array> que emite chunks de texto conforme Claude responde.
// Ideal para streaming em API routes do Next.js.
export function streamChatResponse(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): ReadableStream<Uint8Array> {
  const client = getClient()
  const encoder = new TextEncoder()

  const messages: MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })
}

export async function callClaude(prompt: DigestPrompt): Promise<string> {
  const client = getClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error(`Claude retornou resposta inesperada: type=${block?.type}`)
  }

  return block.text
}
