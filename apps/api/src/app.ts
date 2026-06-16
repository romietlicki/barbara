import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import authPlugin from './plugins/auth.js'
import { registerRoutes } from './routes/index.js'
import { startWorkers } from './workers/index.js'
import { initAllSchedulers } from '@repo/queue'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      // Nunca logar o body das requisições — pode conter conteúdo de mensagens
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
          }
        },
      },
    },
    trustProxy: true,
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  })
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  })
  await app.register(authPlugin)
  await app.register(registerRoutes)

  // Inicia workers e schedulers após a aplicação estar pronta
  app.addHook('onReady', async () => {
    try {
      startWorkers()
    } catch (err) {
      app.log.error({ err }, 'Falha ao iniciar workers — servidor continua')
    }
    try {
      await initAllSchedulers()
    } catch (err) {
      app.log.error({ err }, 'Falha ao iniciar schedulers — servidor continua')
    }
  })

  return app
}
