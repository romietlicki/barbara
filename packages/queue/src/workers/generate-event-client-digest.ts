import { Worker } from 'bullmq'
import { DateTime } from 'luxon'
import { prisma } from '@repo/db'
import { buildCoupleDigestPrompt, callClaude, parseDigestOutput } from '@repo/ai'
import { sendEmail, digestEmailHtml } from '@repo/email'
import { getConnectionOptions } from '../connection'
import type { GenerateEventClientDigestJobData } from '../jobs'

function getDayBoundsUtc(timezone: string): { startUtc: Date; endUtc: Date; dateLabel: string } {
  const now = DateTime.now().setZone(timezone)
  return {
    startUtc: now.startOf('day').toJSDate(),
    endUtc: now.endOf('day').toJSDate(),
    dateLabel: now.toFormat('yyyy-MM-dd'),
  }
}

export function createGenerateEventClientDigestWorker(): Worker<GenerateEventClientDigestJobData> {
  return new Worker<GenerateEventClientDigestJobData>(
    'generate-event-client-digest',
    async (job) => {
      const { tenantId, eventClientId } = job.data

      const eventClient = await prisma.eventClient.findUniqueOrThrow({
        where: { id: eventClientId, tenantId },
        include: {
          groups: { where: { isActive: true }, select: { id: true, name: true } },
        },
      })

      if (eventClient.groups.length === 0) {
        console.log(`[event-client-digest] eventClientId=${eventClientId} sem grupos ativos, pulando`)
        return
      }

      const { startUtc, endUtc, dateLabel } = getDayBoundsUtc(eventClient.timezone)

      const groupIds = eventClient.groups.map((g) => g.id)
      const messages = await prisma.message.findMany({
        where: { tenantId, groupId: { in: groupIds }, timestamp: { gte: startUtc, lte: endUtc } },
        orderBy: { timestamp: 'asc' },
      })

      if (messages.length === 0) {
        console.log(`[event-client-digest] "${eventClient.name}" date=${dateLabel} — sem mensagens, pulando`)
        return
      }

      console.log(`[event-client-digest] "${eventClient.name}" date=${dateLabel} msgs=${messages.length}`)

      const messagesForDigest = messages.map((m) => ({
        groupId: m.groupId,
        author: m.author,
        content: m.content,
        timestamp: m.timestamp,
      }))

      const prompt = buildCoupleDigestPrompt(messagesForDigest, eventClient.groups, eventClient.name, dateLabel)
      const raw = await callClaude(prompt)
      const content = parseDigestOutput(raw)

      await sendEmail({
        to: eventClient.email,
        subject: `Resumo do seu casamento — ${dateLabel}`,
        html: digestEmailHtml(eventClient.name, dateLabel, content),
      })

      console.log(`[event-client-digest] digest de "${eventClient.name}" enviado para ${eventClient.email}`)
    },
    { connection: getConnectionOptions(), concurrency: 3 },
  )
}
