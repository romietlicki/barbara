import { Worker } from 'bullmq'
import { prisma } from '@repo/db'
import { buildCoupleDigestPrompt, callClaude, parseDigestOutput } from '@repo/ai'
import { parseActionsFromDigest } from '@repo/taskade'
import { createTrelloCard } from '@repo/trello'
import { getConnectionOptions } from '../connection'
import type { TrelloExportJobData } from '../jobs'

const COUPLE_MESSAGES_DAYS = 14

export function createTrelloExportWorker(): Worker<TrelloExportJobData> {
  return new Worker<TrelloExportJobData>(
    'trello-export',
    async (job) => {
      const { tenantId } = job.data

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId, isActive: true },
        select: { trelloApiKey: true, trelloToken: true, trelloListId: true },
      })

      if (!tenant?.trelloApiKey || !tenant.trelloToken) {
        console.log(`[trello-export] tenantId=${tenantId} — API Key/Token não configurados, pulando`)
        return
      }

      // ── Export global (digest de gestão) — só se ID da Lista estiver preenchido ──
      if (tenant.trelloListId) {
        const digests = await prisma.digest.findMany({
          where: { tenantId },
          select: { contentMd: true },
          orderBy: { date: 'asc' },
        })

        if (digests.length > 0) {
          const allActions = digests.flatMap((d) => parseActionsFromDigest(d.contentMd))

          if (allActions.length > 0) {
            const existingExports = await prisma.trelloExport.findMany({
              where: { tenantId },
              select: { actionText: true },
            })
            const exportedTexts = new Set(existingExports.map((e) => e.actionText))

            const seenInBatch = new Set<string>()
            const newActions = allActions.filter((a) => {
              if (exportedTexts.has(a.content) || seenInBatch.has(a.content)) return false
              seenInBatch.add(a.content)
              return true
            })

            if (newActions.length > 0) {
              console.log(`[trello-export] tenantId=${tenantId} — exportando ${newActions.length} ação(ões) globais`)
              for (const action of newActions) {
                try {
                  await createTrelloCard(
                    tenant.trelloApiKey!,
                    tenant.trelloToken!,
                    tenant.trelloListId!,
                    action.content,
                    action.criticality,
                  )
                  await prisma.trelloExport.create({
                    data: { tenantId, actionText: action.content },
                  })
                } catch (err) {
                  console.error(`[trello-export] falha ao criar card "${action.content}": ${err}`)
                }
              }
            } else {
              console.log(`[trello-export] tenantId=${tenantId} — todas as ações globais já exportadas`)
            }
          }
        }
      }

      // ── Export por casal ──────────────────────────────────────────────────────
      const eventClients = await prisma.eventClient.findMany({
        where: { tenantId, trelloListId: { not: null } },
        include: { groups: { where: { isActive: true }, select: { id: true, name: true } } },
      })

      for (const ec of eventClients) {
        if (ec.groups.length === 0) continue

        const recentSince = new Date(Date.now() - COUPLE_MESSAGES_DAYS * 24 * 60 * 60 * 1000)
        const groupIds = ec.groups.map((g) => g.id)

        const messages = await prisma.message.findMany({
          where: { tenantId, groupId: { in: groupIds }, timestamp: { gte: recentSince } },
          orderBy: { timestamp: 'asc' },
        })

        if (messages.length === 0) {
          console.log(`[trello-export] casal "${ec.name}" — sem mensagens recentes, pulando`)
          continue
        }

        const dateLabel = `últimos ${COUPLE_MESSAGES_DAYS} dias`
        const messagesForDigest = messages.map((m) => ({
          groupId: m.groupId,
          author: m.author,
          content: m.content,
          timestamp: m.timestamp,
        }))

        let coupleActions: Awaited<ReturnType<typeof parseActionsFromDigest>> = []
        try {
          const prompt = buildCoupleDigestPrompt(messagesForDigest, ec.groups, ec.name, dateLabel)
          const raw = await callClaude(prompt)
          const content = parseDigestOutput(raw)
          coupleActions = parseActionsFromDigest(content)
        } catch (err) {
          console.error(`[trello-export] falha ao gerar ações para casal "${ec.name}": ${err}`)
          continue
        }

        if (coupleActions.length === 0) continue

        const existingCoupleExports = await prisma.eventClientTrelloExport.findMany({
          where: { eventClientId: ec.id },
          select: { actionText: true },
        })
        const exportedCoupleTexts = new Set(existingCoupleExports.map((e) => e.actionText))

        const seenCouple = new Set<string>()
        const newCoupleActions = coupleActions.filter((a) => {
          if (exportedCoupleTexts.has(a.content) || seenCouple.has(a.content)) return false
          seenCouple.add(a.content)
          return true
        })

        if (newCoupleActions.length === 0) {
          console.log(`[trello-export] casal "${ec.name}" — todas as ações já exportadas`)
          continue
        }

        console.log(`[trello-export] casal "${ec.name}" — exportando ${newCoupleActions.length} ação(ões)`)

        for (const action of newCoupleActions) {
          try {
            await createTrelloCard(
              tenant.trelloApiKey!,
              tenant.trelloToken!,
              ec.trelloListId!,
              action.content,
              action.criticality,
            )
            await prisma.eventClientTrelloExport.create({
              data: { tenantId, eventClientId: ec.id, actionText: action.content },
            })
          } catch (err) {
            console.error(`[trello-export] casal "${ec.name}" falha no card "${action.content}": ${err}`)
          }
        }
      }
    },
    { connection: getConnectionOptions(), concurrency: 2 },
  )
}
