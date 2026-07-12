import { Worker } from 'bullmq'
import { prisma } from '@repo/db'
import { buildCoupleTrelloActionsPrompt, callClaude, TRELLO_NO_ACTIONS_MARKER } from '@repo/ai'
import { parseActionsFromDigest } from '@repo/taskade'
import { createTrelloCard, createCoupleCard, getCardChecklists, createChecklist, addChecklistItem } from '@repo/trello'
import { getConnectionOptions } from '../connection'
import type { TrelloExportJobData } from '../jobs'

const COUPLE_MESSAGES_DAYS = 14

const CHECKLIST_NAMES: Record<string, string> = {
  Alta: 'Alta Prioridade',
  Média: 'Média Prioridade',
  Baixa: 'Baixa Prioridade',
}

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

      if (!tenant.trelloListId) {
        console.log(`[trello-export] tenantId=${tenantId} — ID da Lista não configurado, pulando`)
        return
      }

      const { trelloApiKey, trelloToken, trelloListId } = tenant as { trelloApiKey: string; trelloToken: string; trelloListId: string }

      // ── Export global (digest de gestão) ─────────────────────────────────────
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
                await createTrelloCard(trelloApiKey, trelloToken, trelloListId, action.content, action.criticality)
                await prisma.trelloExport.create({ data: { tenantId, actionText: action.content } })
              } catch (err) {
                console.error(`[trello-export] falha ao criar card "${action.content}": ${err}`)
              }
            }
          } else {
            console.log(`[trello-export] tenantId=${tenantId} — todas as ações globais já exportadas`)
          }
        }
      }

      // ── Export por casal (card único com checklists) ──────────────────────────
      const eventClients = await prisma.eventClient.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          trelloCardId: true,
          groups: { where: { isActive: true }, select: { id: true, name: true } },
        },
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

        const messagesForDigest = messages.map((m) => ({
          groupId: m.groupId,
          author: m.author,
          content: m.content,
          timestamp: m.timestamp,
        }))

        let coupleActions: Awaited<ReturnType<typeof parseActionsFromDigest>> = []
        try {
          const prompt = buildCoupleTrelloActionsPrompt(
            messagesForDigest,
            ec.groups,
            ec.name,
            `últimos ${COUPLE_MESSAGES_DAYS} dias`,
          )
          const raw = await callClaude(prompt)
          if (raw.includes(TRELLO_NO_ACTIONS_MARKER)) {
            console.log(`[trello-export] casal "${ec.name}" — sem ações concretas, nenhum item criado`)
            continue
          }
          coupleActions = parseActionsFromDigest(raw)
        } catch (err) {
          console.error(`[trello-export] falha ao gerar ações para casal "${ec.name}": ${err}`)
          continue
        }

        if (coupleActions.length === 0) continue

        const existingExports = await prisma.eventClientTrelloExport.findMany({
          where: { eventClientId: ec.id },
          select: { actionText: true },
        })
        const exportedTexts = new Set(existingExports.map((e) => e.actionText))

        const seenInBatch = new Set<string>()
        const newActions = coupleActions.filter((a) => {
          if (exportedTexts.has(a.content) || seenInBatch.has(a.content)) return false
          seenInBatch.add(a.content)
          return true
        })

        if (newActions.length === 0) {
          console.log(`[trello-export] casal "${ec.name}" — todas as ações já exportadas`)
          continue
        }

        try {
          // Obtém ou cria o card do casal
          let cardId = ec.trelloCardId
          if (!cardId) {
            cardId = await createCoupleCard(trelloApiKey, trelloToken, trelloListId, ec.name)
            await prisma.eventClient.update({ where: { id: ec.id }, data: { trelloCardId: cardId } })
          }

          // Busca checklists existentes no card e cria os que faltam
          const existingChecklists = await getCardChecklists(trelloApiKey, trelloToken, cardId)
          const checklistMap = new Map(existingChecklists.map((c) => [c.name, c.id]))

          const neededCriticalities = [...new Set(newActions.map((a) => a.criticality))]
          for (const criticality of neededCriticalities) {
            const clName = CHECKLIST_NAMES[criticality]!
            if (!checklistMap.has(clName)) {
              const clId = await createChecklist(trelloApiKey, trelloToken, cardId, clName)
              checklistMap.set(clName, clId)
            }
          }

          // Adiciona os itens novos nos checklists correspondentes
          for (const action of newActions) {
            try {
              const checklistId = checklistMap.get(CHECKLIST_NAMES[action.criticality]!)!
              await addChecklistItem(trelloApiKey, trelloToken, checklistId, action.content)
              await prisma.eventClientTrelloExport.create({
                data: { tenantId, eventClientId: ec.id, actionText: action.content },
              })
            } catch (err) {
              console.error(`[trello-export] casal "${ec.name}" — falha no item "${action.content}": ${err}`)
            }
          }

          console.log(`[trello-export] casal "${ec.name}" — ${newActions.length} item(ns) adicionado(s) ao card`)
        } catch (err) {
          console.error(`[trello-export] casal "${ec.name}" — falha ao criar/atualizar card: ${err}`)
        }
      }
    },
    { connection: getConnectionOptions(), concurrency: 2 },
  )
}
