import { Worker } from 'bullmq'
import { DateTime } from 'luxon'
import { prisma } from '@repo/db'
import { sendEmail, digestEmailHtml } from '@repo/email'
import { getConnectionOptions } from '../connection'
import type { SendDigestJobData } from '../jobs'

export function createSendDigestWorker(): Worker<SendDigestJobData> {
  return new Worker<SendDigestJobData>(
    'send-digest',
    async (job) => {
      const { digestId, tenantId } = job.data
      console.log(`[send-digest] processando job=${job.id} digestId=${digestId}`)

      const digest = await prisma.digest.findUniqueOrThrow({
        where: { id: digestId },
        include: { tenant: true },
      })

      if (digest.sentAt !== null) {
        console.log(`[send-digest] digestId=${digestId} já enviado em ${digest.sentAt.toISOString()}, pulando`)
        return
      }

      if (digest.tenantId !== tenantId) {
        throw new Error(`Tenant mismatch: digest.tenantId=${digest.tenantId} job.tenantId=${tenantId}`)
      }

      const { tenant } = digest
      if (!tenant.isActive) {
        console.log(`[send-digest] digestId=${digestId} tenant inativo, pulando`)
        return
      }

      if (!tenant.email) {
        console.warn(`[send-digest] digestId=${digestId} tenant sem email configurado, pulando`)
        return
      }

      const dateLabel = DateTime.fromJSDate(digest.date).toFormat('yyyy-MM-dd')

      await sendEmail({
        to: tenant.email,
        subject: `Resumo do dia ${dateLabel} — ${tenant.name}`,
        html: digestEmailHtml(tenant.name, dateLabel, digest.contentMd),
      })

      await prisma.digest.update({
        where: { id: digestId },
        data: { sentAt: new Date() },
      })

      console.log(`[send-digest] digestId=${digestId} enviado para ${tenant.email}`)
    },
    {
      connection: getConnectionOptions(),
      concurrency: 5,
    },
  )
}
