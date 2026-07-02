import { prisma } from '@repo/db'
import { generateDigestQueue, generateEventClientDigestQueue, trelloExportQueue } from './queues'

function buildCron(
  digestTime: string,
  frequency: string,
  dayOfWeek: number,
  dayOfMonth: number,
): string {
  const [h, m] = digestTime.split(':').map(Number)
  const hours = h ?? 0
  const minutes = m ?? 0
  switch (frequency) {
    case 'weekly':  return `${minutes} ${hours} * * ${dayOfWeek}`
    case 'monthly': return `${minutes} ${hours} ${dayOfMonth} * *`
    default:        return `${minutes} ${hours} * * *` // daily
  }
}

export async function upsertTenantScheduler(
  tenantId: string,
  digestTime: string,
  timezone: string,
  frequency = 'daily',
  dayOfWeek = 1,
  dayOfMonth = 1,
): Promise<void> {
  const pattern = buildCron(digestTime, frequency, dayOfWeek, dayOfMonth)
  await generateDigestQueue.upsertJobScheduler(
    `tenant:${tenantId}`,
    { pattern, tz: timezone },
    { name: 'generate-digest', data: { tenantId } },
  )
}

export async function removeTenantScheduler(tenantId: string): Promise<void> {
  await generateDigestQueue.removeJobScheduler(`tenant:${tenantId}`)
}

export async function upsertEventClientScheduler(
  eventClientId: string,
  tenantId: string,
  digestTime: string,
  timezone: string,
  frequency = 'daily',
  dayOfWeek = 1,
  dayOfMonth = 1,
): Promise<void> {
  const pattern = buildCron(digestTime, frequency, dayOfWeek, dayOfMonth)
  await generateEventClientDigestQueue.upsertJobScheduler(
    `event-client:${eventClientId}`,
    { pattern, tz: timezone },
    { name: 'generate-event-client-digest', data: { tenantId, eventClientId } },
  )
}

export async function removeEventClientScheduler(eventClientId: string): Promise<void> {
  await generateEventClientDigestQueue.removeJobScheduler(`event-client:${eventClientId}`)
}

export async function upsertTrelloScheduler(tenantId: string, intervalHours: number): Promise<void> {
  await trelloExportQueue.upsertJobScheduler(
    `trello:${tenantId}`,
    { every: intervalHours * 60 * 60 * 1000 },
    { name: 'trello-export', data: { tenantId } },
  )
}

export async function removeTrelloScheduler(tenantId: string): Promise<void> {
  await trelloExportQueue.removeJobScheduler(`trello:${tenantId}`)
}

export async function initAllSchedulers(): Promise<void> {
  const [tenants, eventClients, trelloTenants] = await Promise.all([
    prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, digestTime: true, timezone: true, digestFrequency: true, digestDayOfWeek: true, digestDayOfMonth: true },
    }),
    prisma.eventClient.findMany({
      select: { id: true, tenantId: true, digestTime: true, timezone: true, digestFrequency: true, digestDayOfWeek: true, digestDayOfMonth: true },
    }),
    prisma.tenant.findMany({
      where: {
        isActive: true,
        trelloApiKey: { not: null },
        trelloToken: { not: null },
        trelloListId: { not: null },
      },
      select: { id: true, trelloScheduleHours: true },
    }),
  ])

  await Promise.all([
    ...tenants.map((t) =>
      upsertTenantScheduler(t.id, t.digestTime, t.timezone, t.digestFrequency, t.digestDayOfWeek, t.digestDayOfMonth),
    ),
    ...eventClients.map((ec) =>
      upsertEventClientScheduler(ec.id, ec.tenantId, ec.digestTime, ec.timezone, ec.digestFrequency, ec.digestDayOfWeek, ec.digestDayOfMonth),
    ),
    ...trelloTenants.map((t) =>
      upsertTrelloScheduler(t.id, t.trelloScheduleHours),
    ),
  ])

  console.log(`[scheduler] ${tenants.length} tenant(s) + ${eventClients.length} casal(is) + ${trelloTenants.length} Trello(s) registrado(s)`)
}
