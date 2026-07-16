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
          trelloLastCheckedAt: true,
          groups: { where: { isActive: true }, select: { id: true, name: true } },
        },
      })

      for (const ec of eventClients) {
        if (ec.groups.length === 0) continue

        const recentSince = new Date(Date.now() - COUPLE_MESSAGES_DAYS * 24 * 60 * 60 * 1000)
        const groupIds = ec.groups.map((g) => g.id)

        // ── 1. Sincroniza status dos itens com o Trello ───────────────────────
        if (ec.trelloCardId) {
          try {
            const checklists = await getCardChecklists(trelloApiKey, trelloToken, ec.trelloCardId)
            for (const cl of checklists) {
              for (const item of cl.checkItems) {
                const isDone = item.state === 'complete'
                const byId = await prisma.eventClientTrelloExport.findFirst({
                  where: { eventClientId: ec.id, trelloItemId: item.id },
                })
                if (byId) {
                  if (byId.status !== (isDone ? 'done' : 'pending')) {
                    await prisma.eventClientTrelloExport.update({
                      where: { id: byId.id },
                      data: { status: isDone ? 'done' : 'pending', doneAt: isDone ? new Date() : null },
                    })
                  }
                } else {
                  await prisma.eventClientTrelloExport.updateMany({
                    where: { eventClientId: ec.id, actionText: item.name, trelloItemId: null },
                    data: {
                      trelloItemId: item.id,
                      checklistName: cl.name,
                      status: isDone ? 'done' : 'pending',
                      doneAt: isDone ? new Date() : null,
                    },
                  })
                }
              }
            }
          } catch (err) {
            console.error(`[trello-export] casal "${ec.name}" — falha ao sincronizar status: ${err}`)
          }
        }

        // ── 2. Verifica se há mensagens novas desde a última análise ──────────
        // Consulta barata: apenas o timestamp da mensagem mais recente
        const latestMessage = await prisma.message.findFirst({
          where: { tenantId, groupId: { in: groupIds }, timestamp: { gte: recentSince } },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true },
        })

        if (!latestMessage) {
          console.log(`[trello-export] casal "${ec.name}" — sem mensagens recentes, pulando`)
          continue
        }

        if (ec.trelloLastCheckedAt && latestMessage.timestamp <= ec.trelloLastCheckedAt) {
          console.log(`[trello-export] casal "${ec.name}" — sem mensagens novas desde última análise, pulando IA`)
          continue
        }

        // ── 3. Carrega mensagens completas e chama a IA ───────────────────────
        const messages = await prisma.message.findMany({
          where: { tenantId, groupId: { in: groupIds }, timestamp: { gte: recentSince } },
          orderBy: { timestamp: 'asc' },
        })

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

          // Registra que analisamos até agora, independente do resultado da IA.
          // Se esta atualização falhar, a próxima rodada chamará a IA novamente — aceitável.
          await prisma.eventClient.update({
            where: { id: ec.id },
            data: { trelloLastCheckedAt: new Date() },
          })

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

        // ── 4. Filtra ações já registradas (pending OU done) ──────────────────
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
          console.log(`[trello-export] casal "${ec.name}" — todas as ações já registradas`)
          continue
        }

        // ── 5. Garante card único — erros aqui são fatais para este casal ──────
        // Re-lê do banco para evitar duplicata em caso de runs simultâneos
        const freshEc = await prisma.eventClient.findUnique({
          where: { id: ec.id },
          select: { trelloCardId: true },
        })
        let cardId = freshEc?.trelloCardId ?? ec.trelloCardId
        if (!cardId) {
          try {
            cardId = await createCoupleCard(trelloApiKey, trelloToken, trelloListId, ec.name)
            console.log(`[trello-export] casal "${ec.name}" — card criado no Trello: ${cardId}`)
          } catch (err) {
            console.error(`[trello-export] casal "${ec.name}" — falha ao criar card no Trello: ${err}`)
            continue
          }
          try {
            await prisma.eventClient.update({ where: { id: ec.id }, data: { trelloCardId: cardId } })
            console.log(`[trello-export] casal "${ec.name}" — trelloCardId salvo no banco`)
          } catch (err) {
            // Card existe no Trello mas o ID não foi salvo — a próxima rodada criaria duplicata.
            // Interrompemos o casal para evitar adicionar itens a um card "fantasma".
            console.error(`[trello-export] casal "${ec.name}" — CRÍTICO: card criado (${cardId}) mas falha ao salvar no banco: ${err}`)
            continue
          }
        }

        // ── 6. Adiciona itens nos checklists ──────────────────────────────────
        try {
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

          for (const action of newActions) {
            try {
              const clName = CHECKLIST_NAMES[action.criticality]!
              const checklistId = checklistMap.get(clName)!
              const itemId = await addChecklistItem(trelloApiKey, trelloToken, checklistId, action.content)
              await prisma.eventClientTrelloExport.create({
                data: {
                  tenantId,
                  eventClientId: ec.id,
                  actionText: action.content,
                  trelloItemId: itemId,
                  checklistName: clName,
                  status: 'pending',
                },
              })
            } catch (err) {
              console.error(`[trello-export] casal "${ec.name}" — falha no item "${action.content}": ${err}`)
            }
          }

          console.log(`[trello-export] casal "${ec.name}" — ${newActions.length} item(ns) adicionado(s) ao card`)
        } catch (err) {
          console.error(`[trello-export] casal "${ec.name}" — falha ao atualizar checklists: ${err}`)
        }
      }
    },
    { connection: getConnectionOptions(), concurrency: 2 },
  )
}
