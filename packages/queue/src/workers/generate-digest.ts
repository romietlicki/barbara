import { Worker } from 'bullmq'
import { DateTime } from 'luxon'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@repo/db'
import { buildDigestPrompt, callClaude, parseDigestOutput } from '@repo/ai'
import { parseActionsFromDigest, createTaskadeTask } from '@repo/taskade'
import { getConnectionOptions } from '../connection'
import { sendDigestQueue } from '../queues'
import type { GenerateDigestJobData } from '../jobs'

const R2_THRESHOLD = 4000

function getDayBoundsUtc(timezone: string): { startUtc: Date; endUtc: Date; dateLabel: string } {
  const now = DateTime.now().setZone(timezone)
  return {
    startUtc: now.startOf('day').toJSDate(),
    endUtc: now.endOf('day').toJSDate(),
    dateLabel: now.toFormat('yyyy-MM-dd'),
  }
}

let _r2: S3Client | undefined | null = undefined

function getR2Client(): S3Client | null {
  if (_r2 !== undefined) return _r2
  const accountId = process.env['R2_ACCOUNT_ID']
  const accessKeyId = process.env['R2_ACCESS_KEY_ID']
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY']
  if (!accountId || !accessKeyId || !secretAccessKey) {
    _r2 = null
    return null
  }
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _r2
}

async function uploadToR2(tenantId: string, dateLabel: string, content: string): Promise<string | undefined> {
  const r2 = getR2Client()
  if (!r2) return undefined
  const bucket = process.env['R2_BUCKET_NAME'] ?? 'whatsapp-digests'
  const key = `digests/${tenantId}/${dateLabel}.md`
  await r2.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: content,
    ContentType: 'text/markdown; charset=utf-8',
  }))
  return key
}

export function createGenerateDigestWorker(): Worker<GenerateDigestJobData> {
  return new Worker<GenerateDigestJobData>(
    'generate-digest',
    async (job) => {
      const { tenantId } = job.data

      const tenant = await prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId, isActive: true },
        include: { groups: { where: { isActive: true } } },
      })

      const { startUtc, endUtc, dateLabel } = getDayBoundsUtc(tenant.timezone)

      const messages = await prisma.message.findMany({
        where: { tenantId, timestamp: { gte: startUtc, lte: endUtc } },
        orderBy: { timestamp: 'asc' },
      })

      if (messages.length === 0) {
        console.log(`[generate-digest] tenantId=${tenantId} date=${dateLabel} — sem mensagens, pulando`)
        return
      }

      const groups = tenant.groups.map((g) => ({ id: g.id, name: g.name }))
      const messagesForDigest = messages.map((m) => ({
        groupId: m.groupId,
        author: m.author,
        content: m.content,
        timestamp: m.timestamp,
      }))

      console.log(`[generate-digest] tenantId=${tenantId} date=${dateLabel} msgs=${messages.length}`)

      // Digest principal do tenant (todos os grupos combinados)
      const prompt = buildDigestPrompt(messagesForDigest, groups, tenant.name, dateLabel)
      const raw = await callClaude(prompt)
      const content = parseDigestOutput(raw)

      let r2Key: string | undefined
      if (content.length > R2_THRESHOLD) {
        r2Key = await uploadToR2(tenantId, dateLabel, content)
      }

      const date = new Date(`${dateLabel}T00:00:00.000Z`)
      const digest = await prisma.digest.upsert({
        where: { tenantId_date: { tenantId, date } },
        update: { contentMd: content.slice(0, R2_THRESHOLD), r2Key: r2Key ?? null },
        create: { tenantId, date, contentMd: content.slice(0, R2_THRESHOLD), r2Key: r2Key ?? null },
      })

      await sendDigestQueue.add('send-digest', { tenantId, digestId: digest.id })
      console.log(`[generate-digest] digestId=${digest.id} enfileirado para envio`)

      if (tenant.taskadeWebhookUrl) {
        const actions = parseActionsFromDigest(content)
        if (actions.length > 0) {
          console.log(`[generate-digest] exportando ${actions.length} ação(ões) para Taskade`)
          await Promise.allSettled(
            actions.map((a) =>
              createTaskadeTask(tenant.taskadeWebhookUrl!, a.content, a.criticality).catch(
                (err: unknown) => console.error(`[generate-digest] falha ao criar task Taskade: ${err}`),
              ),
            ),
          )
        }
      }

    },
    { connection: getConnectionOptions(), concurrency: 2 },
  )
}
