import {
  createIngestMessageWorker,
  createGenerateDigestWorker,
  createGenerateEventClientDigestWorker,
  createSendDigestWorker,
} from '@repo/queue'
import { prisma } from '@repo/db'
import { sendEmail, digestFailureHtml } from '@repo/email'

// TODO: Semana 6 — extrair para apps/worker se precisar escalar workers independentemente
export function startWorkers(): void {
  const ingestWorker = createIngestMessageWorker()
  const generateWorker = createGenerateDigestWorker()
  const generateEventClientWorker = createGenerateEventClientDigestWorker()
  const sendWorker = createSendDigestWorker()

  const workers = [ingestWorker, generateWorker, generateEventClientWorker, sendWorker]

  for (const worker of workers) {
    worker.on('error', (err) => {
      console.error(`[worker:${worker.name}]`, err.message)
    })
  }

  // Notifica o admin da agência quando send-digest falha definitivamente
  sendWorker.on('failed', async (job, err) => {
    if (!job) return

    const maxAttempts = job.opts.attempts ?? 5
    if (job.attemptsMade < maxAttempts) return  // ainda há tentativas restantes

    const { digestId } = job.data

    try {
      const digest = await prisma.digest.findUnique({
        where: { id: digestId },
        include: {
          tenant: {
            select: {
              name: true,
              agency: {
                include: {
                  users: {
                    where: { role: 'AGENCY_ADMIN' },
                    select: { email: true },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      })

      const adminEmail = digest?.tenant.agency.users[0]?.email
      if (!adminEmail) {
        console.warn(`[send-digest] digestId=${digestId} falhou mas sem AGENCY_ADMIN para notificar`)
        return
      }

      const dateLabel = digest.date
        ? new Date(digest.date).toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'data desconhecida'

      await sendEmail({
        to: adminEmail,
        subject: `Falha no digest — ${digest.tenant.name}`,
        html: digestFailureHtml(digest.tenant.name, dateLabel, err.message),
      })

      console.log(`[send-digest] notificação de falha enviada para ${adminEmail}`)
    } catch (emailErr) {
      console.error('[send-digest] erro ao enviar email de falha:', emailErr)
    }
  })

  // Log genérico para os outros workers
  ingestWorker.on('failed', (job, err) => {
    console.error(`[worker:${ingestWorker.name}] job ${job?.id} falhou:`, err.message)
  })
  generateWorker.on('failed', (job, err) => {
    console.error(`[worker:${generateWorker.name}] job ${job?.id} falhou:`, err.message)
  })
  generateEventClientWorker.on('failed', (job, err) => {
    console.error(`[worker:generate-event-client-digest] job ${job?.id} falhou:`, err.message)
  })
  sendWorker.on('failed', (job, err) => {
    console.error(`[worker:send-digest] job ${job?.id} tentativa=${job?.attemptsMade} falhou:`, err.message)
  })

  console.log('[workers] 3 worker(s) inicializado(s)')
}
