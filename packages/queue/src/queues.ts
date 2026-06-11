import { Queue } from 'bullmq'
import { getConnectionOptions } from './connection'
import type {
  IngestMessageJobData,
  GenerateDigestJobData,
  GenerateEventClientDigestJobData,
  SendDigestJobData,
} from './jobs'

// Nome explícito no type param para que add() seja tipado corretamente no BullMQ v5
export const ingestMessageQueue = new Queue<IngestMessageJobData, void, 'ingest-message'>(
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
export const generateDigestQueue = new Queue<GenerateDigestJobData, void, string>(
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

export const generateEventClientDigestQueue = new Queue<GenerateEventClientDigestJobData, void, string>(
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

export const sendDigestQueue = new Queue<SendDigestJobData, void, 'send-digest'>(
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
