import type { FastifyInstance } from 'fastify'
import { webhookRoutes } from './webhooks.js'
import { stripeRoutes } from './stripe.js'
import { internalRoutes } from './internal.js'

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Webhooks da Evolution API — autenticados via X-Webhook-Token
  await app.register(webhookRoutes, { prefix: '/webhooks' })

  // Webhooks do Stripe — autenticados via assinatura HMAC (stripe-signature header)
  await app.register(stripeRoutes, { prefix: '/webhooks' })

  // Rotas internas para apps/web → Fastify (autenticadas via X-Internal-Api-Key)
  await app.register(internalRoutes, { prefix: '/internal' })
}
