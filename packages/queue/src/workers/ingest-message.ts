import { Worker } from 'bullmq'
import { getConnectionOptions } from '../connection'
import type { IngestMessageJobData } from '../jobs'

// Pós-processamento assíncrono de mensagens capturadas pelo webhook.
// O webhook já salvou a Message — este worker trata efeitos colaterais.
export function createIngestMessageWorker(): Worker<IngestMessageJobData> {
  return new Worker<IngestMessageJobData>(
    'ingest-message',
    async (_job) => {
      // TODO: Semana 4 — notificar painel em tempo real via SSE/WebSocket
    },
    {
      connection: getConnectionOptions(),
      concurrency: 20,
    },
  )
}
