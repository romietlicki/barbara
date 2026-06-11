'use server'

import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { prisma } from '@repo/db'
import { requireRole } from '@/lib/auth-context'

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada')
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' })
}

export async function createCheckoutAction() {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId
  if (!agencyId) throw new Error('Usuário sem agência associada')

  const priceId = process.env['STRIPE_PRICE_ID']
  if (!priceId) throw new Error('STRIPE_PRICE_ID não configurada')

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
    select: { stripeCustomerId: true },
  })

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

  const stripeSession = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { agencyId },
    // Reutiliza o customer existente para preservar histórico de pagamento
    customer: agency.stripeCustomerId ?? undefined,
    success_url: `${appUrl}/dashboard/agency/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/agency/billing?canceled=1`,
  })

  redirect(stripeSession.url!)
}

export async function createPortalAction() {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId
  if (!agencyId) throw new Error('Usuário sem agência associada')

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
    select: { stripeCustomerId: true },
  })

  if (!agency.stripeCustomerId) {
    throw new Error('Agência sem conta Stripe. Assine primeiro.')
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: agency.stripeCustomerId,
    return_url: `${appUrl}/dashboard/agency/billing`,
  })

  redirect(portalSession.url)
}
