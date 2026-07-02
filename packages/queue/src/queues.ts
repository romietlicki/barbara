import { Queue } from 'bullmq'
import { getConnectionOptions } from './connection'
import type {
  IngestMessageJobData,
  GenerateDigestJobData,
  GenerateEventClientDigestJobData,
  SendDigestJobData,
  TrelloExportJobData,
} from './jobs'

function makeQueue<D, R, N extends string>(name: string, opts: ConstructorParameters<typeof Queue>[1]) {
  const q = new Queue<D, R, N>(name, opts)
  q.on('error', (err) => console.error(`[queue:${name}]`, err.message))
  return q
}

// Nome explícito no type param para que add() seja tipado corretamente no BullMQ v5
export const ingestMessageQueue = makeQueue<IngestMessageJobData, void, 'ingest-message'>(
  'ingest-message',
  {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  },
)

// Sem NameType literal: upsertJobScheduler aceita qualquer string como schedulerId
export const generateDigestQueue = makeQueue<GenerateDigestJobData, void, string>(
  'generate-digest',
  {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  },
)

export const generateEventClientDigestQueue = makeQueue<GenerateEventClientDigestJobData, void, string>(
  'generate-event-client-digest',
  {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  },
)

export const sendDigestQueue = makeQueue<SendDigestJobData, void, 'send-digest'>(
  'send-digest',
  {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    },
  },
)

export const trelloExportQueue = makeQueue<TrelloExportJobData, void, string>(
  'trello-export',
  {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  },
)
