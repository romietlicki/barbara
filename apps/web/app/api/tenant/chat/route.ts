import { auth } from '@/auth'
import { prisma } from '@repo/db'
import { streamChatResponse } from '@repo/ai'
import type { ChatMessage } from '@repo/ai'

// Mensagens brutas recentes — detalhes dos últimos dias
const RECENT_MESSAGES_DAYS = 14
const RECENT_MESSAGES_LIMIT = 500

// Digests históricos — resumos compactos de períodos anteriores
const HISTORICAL_DIGESTS_LIMIT = 30

export async function POST(request: Request): Promise<Response> {
  const session = await auth()

  if (!session?.user || session.user.role !== 'TENANT_USER' || !session.user.tenantId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const tenantId = session.user.tenantId

  let body: { message: string; history?: ChatMessage[]; groupId?: string }
  try {
    body = await request.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const { message, history = [], groupId } = body
  if (!message?.trim()) return new Response('Bad Request', { status: 400 })

  const recentSince = new Date(Date.now() - RECENT_MESSAGES_DAYS * 24 * 60 * 60 * 1000)

  const [tenant, eventClients, recentMessages, historicalDigests, messageStats] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),

    // Casais com grupos vinculados
    prisma.eventClient.findMany({
      where: { tenantId },
      select: {
        name: true,
        email: true,
        description: true,
        groups: { select: { id: true, name: true } },
      },
    }),

    // Mensagens brutas recentes — filtra por grupo se especificado
    prisma.message.findMany({
      where: {
        tenantId,
        timestamp: { gte: recentSince },
        group: { isActive: true },
        ...(groupId ? { groupId } : {}),
      },
      orderBy: { timestamp: 'asc' },
      take: RECENT_MESSAGES_LIMIT,
      select: {
        content: true,
        author: true,
        timestamp: true,
        group: { select: { name: true } },
      },
    }),

    // Digests históricos já gerados (resumos compactos de períodos anteriores)
    prisma.digest.findMany({
      where: { tenantId, sentAt: { not: null } },
      orderBy: { date: 'desc' },
      take: HISTORICAL_DIGESTS_LIMIT,
      select: { date: true, contentMd: true },
    }),

    // Estatísticas do banco — mostra ao usuário o alcance total dos dados
    prisma.message.aggregate({
      where: { tenantId },
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true },
    }),
  ])

  // Contexto dos casais
  const eventClientsCtx = eventClients.length > 0
    ? `CASAIS / EVENTOS:\n${eventClients.map((ec) => {
        const grupos = ec.groups.map((g) => g.name).join(', ') || 'sem grupo vinculado'
        const desc = ec.description ? ` — ${ec.description}` : ''
        return `• ${ec.name} (${ec.email})${desc}\n  Grupos: ${grupos}`
      }).join('\n')}`
    : ''

  // Contexto histórico via digests
  const historicalCtx = historicalDigests.length > 0
    ? `HISTÓRICO DE RESUMOS DIÁRIOS (${historicalDigests.length} dias anteriores):\n${
        historicalDigests
          .reverse()
          .map((d) => {
            const date = new Date(d.date).toLocaleDateString('pt-BR')
            return `--- ${date} ---\n${d.contentMd}`
          })
          .join('\n\n')
      }`
    : ''

  // Mensagens brutas recentes
  const recentCtx = recentMessages.length > 0
    ? `MENSAGENS RECENTES (últimos ${RECENT_MESSAGES_DAYS} dias — ${recentMessages.length} mensagens):\n${
        recentMessages
          .map((m) => {
            const date = m.timestamp.toLocaleDateString('pt-BR')
            const time = m.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return `[${m.group.name}] ${date} ${time} — ${m.author}: ${m.content}`
          })
          .join('\n')
      }`
    : 'Sem mensagens recentes nos grupos.'

  // Estatísticas para informar o usuário sobre o alcance dos dados
  const statsCtx = messageStats._count > 0
    ? `ALCANCE DOS DADOS NO BANCO:\n• Total de mensagens armazenadas: ${messageStats._count}\n• Período: ${
        new Date(messageStats._min.timestamp!).toLocaleDateString('pt-BR')
      } até ${new Date(messageStats._max.timestamp!).toLocaleDateString('pt-BR')}`
    : ''

  const systemPrompt = `Você é um assistente inteligente integrado à plataforma Barbara, ferramenta de gestão de eventos de casamento da empresa "${tenant?.name ?? ''}".

Você tem acesso completo ao histórico de dados da empresa:
- Resumos diários (digests) dos períodos anteriores — contexto compacto de longo prazo
- Mensagens brutas dos últimos ${RECENT_MESSAGES_DAYS} dias — detalhes recentes
- Cadastro completo dos casais e seus grupos de WhatsApp

Regras:
- Responda sempre em português do Brasil
- Seja direto e útil
- Ao citar informações, indique o grupo, o casal ou a data quando relevante
- Se a informação não estiver nos dados disponíveis, diga claramente
- Se o usuário perguntar sobre dados mais antigos que os disponíveis no contexto atual, explique que os resumos históricos cobrem esse período

${statsCtx}

${eventClientsCtx}

${historicalCtx}

${recentCtx}`

  const safeHistory = history
    .slice(-10)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: String(m.content) }))

  const stream = streamChatResponse(systemPrompt, safeHistory, message.trim())

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
