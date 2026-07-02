import { Worker } from 'bullmq'
import { prisma } from '@repo/db'
import { parseActionsFromDigest } from '@repo/taskade'
import { createTrelloCard } from '@repo/trello'
import { getConnectionOptions } from '../connection'
import type { TrelloExportJobData } from '../jobs'

export function createTrelloExportWorker(): Worker<TrelloExportJobData> {
  return new Worker<TrelloExportJobData>(
    'trello-export',
    async (job) => {
      const { tenantId } = job.data

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId, isActive: true },
        select: { trelloApiKey: true, trelloToken: true, trelloListId: true },
      })

      if (!tenant?.trelloApiKey || !tenant.trelloToken || !tenant.trelloListId) {
        console.log(`[trello-export] tenantId=${tenantId} — Trello não configurado, pulando`)
        return
      }

      const digests = await prisma.digest.findMany({
        where: { tenantId },
        select: { contentMd: true },
        orderBy: { date: 'asc' },
      })

      if (digests.length === 0) {
        console.log(`[trello-export] tenantId=${tenantId} — sem digests, pulando`)
        return
      }

      const allActions = digests.flatMap((d) => parseActionsFromDigest(d.contentMd))

      if (allActions.length === 0) {
        console.log(`[trello-export] tenantId=${tenantId} — sem ações nos digests`)
        return
      }

      const existingExports = await prisma.trelloExport.findMany({
        where: { tenantId },
        select: { actionText: true },
      })
      const exportedTexts = new Set(existingExports.map((e) => e.actionText))

      const newActions = allActions.filter((a) => !exportedTexts.has(a.content))

      if (newActions.length === 0) {
        console.log(`[trello-export] tenantId=${tenantId} — todas as ações já exportadas`)
        return
      }

      console.log(`[trello-export] tenantId=${tenantId} — exportando ${newActions.length} ação(ões) novas`)

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
    },
    { connection: getConnectionOptions(), concurrency: 2 },
  )
}
