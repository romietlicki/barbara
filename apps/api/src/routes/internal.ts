import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/db'
import {
  upsertTenantScheduler,
  removeTenantScheduler,
  upsertEventClientScheduler,
  removeEventClientScheduler,
  upsertTrelloScheduler,
  removeTrelloScheduler,
} from '@repo/queue'

const SchedulerBodySchema = z.object({
  digestTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  digestFrequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  digestDayOfWeek: z.number().int().min(0).max(6).default(1),
  digestDayOfMonth: z.number().int().min(1).max(28).default(1),
})

export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string } }>(
    '/scheduler/:tenantId',
    async (request, reply) => {
      const agencyId = request.auth?.agencyId
      if (!agencyId) return reply.status(403).send({ error: 'Forbidden' })

      const parsed = SchedulerBodySchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Dados inválidos' })

      const { tenantId } = request.params
      const { digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth } = parsed.data

      await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId, agencyId } })
      await upsertTenantScheduler(tenantId, digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth)
      return { ok: true }
    },
  )

  app.delete<{ Params: { tenantId: string } }>(
    '/scheduler/:tenantId',
    async (request, reply) => {
      const agencyId = request.auth?.agencyId
      if (!agencyId) return reply.status(403).send({ error: 'Forbidden' })

      await prisma.tenant.findUniqueOrThrow({ where: { id: request.params.tenantId, agencyId } })
      await removeTenantScheduler(request.params.tenantId)
      return { ok: true }
    },
  )

  app.post<{ Params: { eventClientId: string } }>(
    '/scheduler/event-client/:eventClientId',
    async (request, reply) => {
      const tenantId = request.auth?.tenantId
      const agencyId = request.auth?.agencyId
      if (!tenantId && !agencyId) return reply.status(403).send({ error: 'Forbidden' })

      const parsed = SchedulerBodySchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Dados inválidos' })

      const { eventClientId } = request.params
      const { digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth } = parsed.data

      const ec = await prisma.eventClient.findUniqueOrThrow({
        where: { id: eventClientId },
        select: { id: true, tenantId: true },
      })

      if (tenantId && ec.tenantId !== tenantId) return reply.status(403).send({ error: 'Forbidden' })
      if (agencyId && !tenantId) {
        await prisma.tenant.findUniqueOrThrow({ where: { id: ec.tenantId, agencyId } })
      }

      await upsertEventClientScheduler(eventClientId, ec.tenantId, digestTime, timezone, digestFrequency, digestDayOfWeek, digestDayOfMonth)
      return { ok: true }
    },
  )

  app.delete<{ Params: { eventClientId: string } }>(
    '/scheduler/event-client/:eventClientId',
    async (request, reply) => {
      const tenantId = request.auth?.tenantId
      const agencyId = request.auth?.agencyId
      if (!tenantId && !agencyId) return reply.status(403).send({ error: 'Forbidden' })

      const ec = await prisma.eventClient.findUniqueOrThrow({
        where: { id: request.params.eventClientId },
        select: { tenantId: true },
      })

      if (tenantId && ec.tenantId !== tenantId) return reply.status(403).send({ error: 'Forbidden' })
      if (agencyId && !tenantId) {
        await prisma.tenant.findUniqueOrThrow({ where: { id: ec.tenantId, agencyId } })
      }

      await removeEventClientScheduler(request.params.eventClientId)
      return { ok: true }
    },
  )

  const TrelloSchedulerBodySchema = z.object({
    intervalHours: z.number().int().min(1).max(24),
  })

  app.post<{ Params: { tenantId: string } }>(
    '/trello-scheduler/:tenantId',
    async (request, reply) => {
      const tenantId = request.auth?.tenantId
      if (!tenantId || tenantId !== request.params.tenantId) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      const parsed = TrelloSchedulerBodySchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({ error: 'Dados inválidos' })

      await upsertTrelloScheduler(tenantId, parsed.data.intervalHours)
      return { ok: true }
    },
  )

  app.delete<{ Params: { tenantId: string } }>(
    '/trello-scheduler/:tenantId',
    async (request, reply) => {
      const tenantId = request.auth?.tenantId
      if (!tenantId || tenantId !== request.params.tenantId) {
        return reply.status(403).send({ error: 'Forbidden' })
      }

      await removeTrelloScheduler(tenantId)
      return { ok: true }
    },
  )
}
