import OpenAI from 'openai'
import type { DigestPrompt } from './prompt'

const MODEL_CHAT = 'gpt-4o'
const MODEL_DIGEST = 'gpt-4o-mini'
const MAX_TOKENS = 4096

let _client: OpenAI | undefined

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env['OPENAI_API_KEY']
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
    _client = new OpenAI({ apiKey, maxRetries: 3 })
  }
  return _client
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export function streamChatResponse(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): ReadableStream<Uint8Array> {
  const client = getClient()
  const encoder = new TextEncoder()

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    { role: 'user', content: userMessage },
  ]

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create({
          model: MODEL_CHAT,
          max_tokens: 2048,
          messages,
          stream: true,
        })

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) controller.enqueue(encoder.encode(delta))
        }
      } finally {
        controller.close()
      }
    },
  })
}

export async function callClaude(prompt: DigestPrompt): Promise<string> {
  const client = getClient()

  const response = await client.chat.completions.create({
    model: MODEL_DIGEST,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI retornou resposta vazia')
  }

  return content
}
