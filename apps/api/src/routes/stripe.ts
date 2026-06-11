import Stripe from 'stripe'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '@repo/db'

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada')
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' })
}

export async function stripeRoutes(app: FastifyInstance): Promise<void> {
  // Buffer parser: Stripe requer o body raw para verificar a assinatura
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body as Buffer)
    },
  )

  app.post(
    '/stripe',
    { config: { rateLimit: { max: 200, timeWindow: '1 minute' } } },
    async (request: FastifyRequest, reply) => {
      const sig = request.headers['stripe-signature']
      const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']

      if (!webhookSecret) {
        app.log.error('STRIPE_WEBHOOK_SECRET não configurada')
        return reply.status(500).send({ error: 'Misconfigured' })
      }

      if (!sig || typeof sig !== 'string') {
        return reply.status(400).send({ error: 'Missing stripe-signature header' })
      }

      let event: Stripe.Event
      try {
        event = getStripe().webhooks.constructEvent(
          request.body as Buffer,
          sig,
          webhookSecret,
        )
      } catch (err) {
        app.log.warn({ err }, 'Stripe webhook: assinatura inválida')
        return reply.status(400).send({ error: 'Invalid signature' })
      }

      app.log.info({ type: event.type }, 'Stripe webhook recebido')

      try {
        await handleStripeEvent(event)
      } catch (err) {
        app.log.error({ type: event.type, err }, 'Stripe webhook: erro ao processar evento')
        // Retorna 200 para evitar retry do Stripe em erros de lógica interna
        return reply.status(200).send({ received: true })
      }

      return reply.status(200).send({ received: true })
    },
  )
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const agencyId = session.metadata?.['agencyId']
      if (!agencyId) break

      await prisma.agency.update({
        where: { id: agencyId },
        data: {
          planStatus: 'ACTIVE',
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
        },
      })
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
      if (!customerId) break

      await prisma.agency.updateMany({
        where: { stripeCustomerId: customerId },
        data: { planStatus: 'ACTIVE' },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
      if (!customerId) break

      await prisma.agency.updateMany({
        where: { stripeCustomerId: customerId },
        data: { planStatus: 'PAST_DUE' },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : null
      if (!customerId) break

      await prisma.agency.updateMany({
        where: { stripeCustomerId: customerId },
        data: { planStatus: 'CANCELED' },
      })
      break
    }
  }
}

// Exporta helpers para server actions do apps/web
export function createStripeClient(): Stripe {
  return getStripe()
}
