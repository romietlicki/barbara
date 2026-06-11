import type { ConnectionOptions } from 'bullmq'

// Retorna opções de conexão para BullMQ (Queue + Worker).
// Usamos config object em vez de instância IORedis para evitar conflito
// entre a versão de ioredis bundlada pelo BullMQ e a que poderíamos instalar separadamente.
export function getConnectionOptions(): ConnectionOptions {
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
  try {
    const u = new URL(url)
    return {
      host: u.hostname,
      port: Number(u.port) || 6379,
      password: u.password || undefined,
      // maxRetriesPerRequest: null é obrigatório para BullMQ
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  } catch {
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null }
  }
}
