import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createCheckoutAction, createPortalAction } from '@/lib/actions/billing'
import type { PlanStatus } from '@repo/db'

const PLAN_CONFIG: Record<
  PlanStatus,
  { label: string; description: string; badgeVariant: 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
  TRIAL: {
    label: 'Período de avaliação',
    description: 'Você está no período gratuito. Assine para continuar usando após o trial.',
    badgeVariant: 'secondary',
  },
  ACTIVE: {
    label: 'Plano ativo',
    description: 'Sua assinatura está em dia. Obrigado!',
    badgeVariant: 'success',
  },
  PAST_DUE: {
    label: 'Pagamento pendente',
    description: 'Houve uma falha no seu pagamento. Regularize para continuar usando.',
    badgeVariant: 'warning',
  },
  CANCELED: {
    label: 'Assinatura cancelada',
    description: 'Sua assinatura foi cancelada. Reative para continuar usando.',
    badgeVariant: 'destructive',
  },
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string }
}) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId!

  const agency = await prisma.agency.findUniqueOrThrow({
    where: { id: agencyId },
    select: { name: true, planStatus: true, stripeCustomerId: true },
  })

  const config = PLAN_CONFIG[agency.planStatus]
  const hasStripeAccount = !!agency.stripeCustomerId

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Plano &amp; Cobrança</h1>

      {searchParams.success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800 font-medium">
            Assinatura ativada com sucesso! Bem-vindo ao plano pago.
          </p>
        </div>
      )}

      {searchParams.canceled && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Checkout cancelado. Você pode tentar novamente quando quiser.</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{agency.name}</p>
            <h2 className="text-lg font-semibold text-gray-900">{config.label}</h2>
          </div>
          <Badge variant={config.badgeVariant}>{agency.planStatus}</Badge>
        </div>

        <p className="text-sm text-gray-500 mb-6">{config.description}</p>

        {agency.planStatus === 'TRIAL' && (
          <form action={createCheckoutAction}>
            <Button type="submit" className="w-full">
              Assinar agora
            </Button>
          </form>
        )}

        {agency.planStatus === 'ACTIVE' && hasStripeAccount && (
          <form action={createPortalAction}>
            <Button type="submit" variant="outline" className="w-full">
              Gerenciar assinatura
            </Button>
          </form>
        )}

        {agency.planStatus === 'PAST_DUE' && hasStripeAccount && (
          <form action={createPortalAction}>
            <Button type="submit" variant="destructive" className="w-full">
              Regularizar pagamento
            </Button>
          </form>
        )}

        {agency.planStatus === 'CANCELED' && (
          <form action={createCheckoutAction}>
            <Button type="submit" className="w-full">
              Reativar assinatura
            </Button>
          </form>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Pagamentos processados com segurança pelo Stripe. Cancele quando quiser.
      </p>
    </div>
  )
}
