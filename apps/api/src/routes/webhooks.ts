import crypto from 'crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@repo/db'
import { parseWebhookPayload, EvolutionApiClient } from '@repo/whatsapp'
import { ingestMessageQueue } from '@repo/queue'
import type { EvolutionWebhookPayload } from '@repo/whatsapp'

// Augment para o rawBody capturado antes do parse
declare module 'fastify' {
  interface FastifyRequest {
    rawBody: Buffer | undefined
  }
}

// Comparação em tempo constante — previne timing attack mesmo para secrets de comprimentos iguais
function verifyWebhookToken(received: string, expected: string): boolean {
  const r = Buffer.from(received, 'utf8')
  const e = Buffer.from(expected, 'utf8')
  if (r.length !== e.length) return false
  return crypto.timingSafeEqual(r, e)
}

type WebhookParams = { agencySlug: string }

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.decorateRequest('rawBody', null)

  // Override do parser JSON neste escopo para capturar o body bruto
  // Necessário para verificação futura de HMAC-SHA256
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      try {
        done(null, JSON.parse((body as Buffer).toString('utf8')))
      } catch (err) {
        done(err as Error)
      }
    },
  )

  app.post<{ Params: WebhookParams }>(
    '/wa/:agencySlug',
    {
      // Limite mais alto que rotas autenticadas — Evolution API pode ter burst de mensagens
      config: { rateLimit: { max: 2000, timeWindow: '1 minute' } },
    },
    async (
      request: FastifyRequest<{ Params: WebhookParams }>,
      reply: FastifyReply,
    ) => {
      const webhookSecret = process.env['EVOLUTION_WEBHOOK_SECRET']

      // Se o secret estiver configurado, verificar o header enviado pela Evolution API
      if (webhookSecret) {
        const receivedToken = request.headers['x-webhook-token']
        if (
          !receivedToken ||
          typeof receivedToken !== 'string' ||
          !verifyWebhookToken(receivedToken, webhookSecret)
        ) {
          // Log sem expor o secret esperado
          app.log.warn(
            { slug: request.params.agencySlug, ip: request.ip },
            'Webhook: token inválido',
          )
          // Retornamos 200 para não revelar ao atacante que a rota existe
          return reply.status(200).send({ ok: false })
        }
      }

      const payload = request.body as EvolutionWebhookPayload

      // LOG TEMPORÁRIO — remover após debug
      app.log.info({
        event: payload.event,
        instance: payload.instance,
        dataType: Array.isArray(payload.data) ? 'array' : typeof payload.data,
        dataKeys: payload.data ? Object.keys(payload.data as object) : [],
        sender: payload.sender,
      }, 'Webhook recebido')

      // groups.upsert → atualiza nomes reais dos grupos no banco
      if (payload.event === 'groups.upsert') {
        type GroupData = { id: string; subject?: string }
        const groups = payload.data as unknown as GroupData[]
        if (Array.isArray(groups)) {
          for (const g of groups) {
            if (!g.id || !g.subject) continue
            await prisma.waGroup.updateMany({
              where: { waGroupId: g.id, tenant: { id: payload.instance } },
              data: { name: g.subject },
            })
          }
          app.log.info({ count: groups.length, tenantId: payload.instance }, 'Nomes de grupos atualizados')
        }
        return reply.status(200).send({ ok: true })
      }

      // connection.update com state=open → atualiza número e sincroniza nomes dos grupos
      if (payload.event === 'connection.update') {
        const connData = payload.data as unknown as { state?: string }
        if (connData.state === 'open') {
          if (payload.sender) {
            const phone = payload.sender.split('@')[0]
            if (phone) {
              await prisma.tenant.updateMany({
                where: { id: payload.instance },
                data: { whatsappPhone: phone },
              })
              app.log.info({ tenantId: payload.instance, phone }, 'WhatsApp conectado — número atualizado')
            }
          }

          // Sincroniza nomes dos grupos via fetchAllGroups (fire-and-forget)
          void (async () => {
            try {
              const client = new EvolutionApiClient()
              const groups = await client.fetchAllGroups(payload.instance)
              for (const g of groups) {
                await prisma.waGroup.updateMany({
                  where: { waGroupId: g.id, tenant: { id: payload.instance } },
                  data: { name: g.subject },
                })
              }
              app.log.info({ count: groups.length, tenantId: payload.instance }, 'Nomes de grupos sincronizados')
            } catch (err) {
              app.log.warn({ err }, 'Falha ao sincronizar nomes de grupos')
            }
          })()
        }
        return reply.status(200).send({ ok: true })
      }

      // Parser normaliza e descarta eventos irrelevantes (fromMe, privado, sem texto, etc.)
      const parsed = parseWebhookPayload(payload)
      if (!parsed) {
        return reply.status(200).send({ ok: true, skipped: true })
      }

      // --- Resolve agência pelo slug da URL ---
      const [agency] = await Promise.all([
        prisma.agency.findUnique({
          where: { slug: request.params.agencySlug },
          select: { id: true, planStatus: true },
        }),
      ])

      if (!agency) {
        app.log.warn({ slug: request.params.agencySlug }, 'Webhook: agência não encontrada')
        return reply.status(200).send({ ok: true, skipped: true })
      }

      if (agency.planStatus === 'CANCELED') {
        return reply.status(200).send({ ok: true, skipped: true })
      }

      // Resolve o tenant pela instância da Evolution API (instanceName = tenantId)
      const tenant = await prisma.tenant.findFirst({
        where: { id: payload.instance, agencyId: agency.id },
        select: { id: true },
      })

      if (!tenant) {
        app.log.warn(
          { instance: payload.instance, agencySlug: request.params.agencySlug },
          'Webhook: tenant não encontrado para instância',
        )
        return reply.status(200).send({ ok: true, skipped: true })
      }

      // Auto-registra o grupo quando visto pela primeira vez (inativo até o admin ativar)
      const existingGroup = await prisma.waGroup.findUnique({
        where: { tenantId_waGroupId: { tenantId: tenant.id, waGroupId: parsed.waGroupId } },
        select: { id: true, tenantId: true, isActive: true, name: true },
      })

      const isNewGroup = !existingGroup

      const group = existingGroup ?? await prisma.waGroup.create({
        data: {
          tenantId: tenant.id,
          waGroupId: parsed.waGroupId,
          name: parsed.waGroupId,
          isActive: false,
          priority: 0,
        },
        select: { id: true, tenantId: true, isActive: true },
      })

      // Novo grupo criado com ID como nome → busca nome real de forma assíncrona
      if (isNewGroup) {
        void (async () => {
          try {
            const client = new EvolutionApiClient()
            const groups = await client.fetchAllGroups(payload.instance)
            for (const g of groups) {
              await prisma.waGroup.updateMany({
                where: { waGroupId: g.id, tenant: { id: payload.instance } },
                data: { name: g.subject },
              })
            }
          } catch (err) {
            app.log.warn({ err }, 'Falha ao buscar nome do novo grupo')
          }
        })()
      }

      if (!group.isActive) {
        app.log.info(
          { waGroupId: parsed.waGroupId, tenantId: tenant.id },
          'Webhook: grupo registrado mas inativo — mensagem descartada',
        )
        return reply.status(200).send({ ok: true, skipped: true })
      }

      // Dedup — checa antes de inserir para evitar unique constraint error
      const exists = await prisma.message.findUnique({
        where: { waMessageId: parsed.waMessageId },
        select: { id: true },
      })
      if (exists) {
        return reply.status(200).send({ ok: true, skipped: true })
      }

      // Salva a mensagem — op. rápida, não bloqueia o return 200
      const message = await prisma.message.create({
        data: {
          tenantId: group.tenantId,
          groupId: group.id,
          waMessageId: parsed.waMessageId,
          author: parsed.author,
          authorPhone: parsed.authorPhone,
          content: parsed.content,
          timestamp: parsed.timestamp,
        },
        select: { id: true },
      })

      // Enqueue assíncrono — fire-and-forget para cumprir < 200ms
      void ingestMessageQueue.add('ingest-message', {
        tenantId: group.tenantId,
        groupId: group.id,
        waGroupId: parsed.waGroupId,
        waMessageId: parsed.waMessageId,
      })

      return reply.status(200).send({ ok: true, messageId: message.id })
    },
  )
}
