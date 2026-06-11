import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wifi, MessageSquare, ChevronRight } from 'lucide-react'
import { EditTenantDialog } from './_components/edit-tenant-dialog'
import { DeleteTenantButton } from './_components/delete-tenant-button'
import { DisconnectWaButton } from './_components/disconnect-wa-button'

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId!

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id, agencyId },
    include: {
      groups: { orderBy: [{ isActive: 'desc' }, { name: 'asc' }], take: 10 },
      digests: { orderBy: { date: 'desc' }, take: 5 },
      _count: { select: { messages: true } },
    },
  })

  if (!tenant) notFound()

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard/agency/clientes" className="hover:text-gray-600">
              Clientes
            </Link>
            <span>/</span>
            <span className="text-gray-700">{tenant.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-500">{tenant.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <EditTenantDialog
            tenantId={tenant.id}
            defaultValues={{
              name: tenant.name,
              email: tenant.email,
              whatsappPhone: tenant.whatsappPhone,
              digestTime: tenant.digestTime,
              digestFrequency: tenant.digestFrequency,
              digestDayOfWeek: tenant.digestDayOfWeek,
              digestDayOfMonth: tenant.digestDayOfMonth,
              timezone: tenant.timezone,
            }}
          />
          <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/agency/clientes/${tenant.id}/grupos`}>
              Grupos
            </Link>
          </Button>
          <DisconnectWaButton tenantId={tenant.id} />
          <Button size="sm" asChild>
            <Link href={`/dashboard/agency/clientes/${tenant.id}/conectar`}>
              <Wifi className="h-4 w-4" />
              Conectar WA
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Grupos ativos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {tenant.groups.filter((g) => g.isActive).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Mensagens</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{tenant._count.messages}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Próximo digest</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{tenant.digestTime}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {tenant.timezone.split('/')[1]?.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Grupos */}
      <section className="bg-white border border-gray-200 rounded-xl mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Grupos monitorados</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/agency/clientes/${tenant.id}/grupos`}>
              Ver todos <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
        {tenant.groups.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">
            Nenhum grupo detectado ainda. Conecte o WhatsApp e envie uma mensagem de teste.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tenant.groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-800">{g.name}</span>
                <Badge variant={g.isActive ? 'success' : 'secondary'} className="text-xs">
                  {g.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Digests */}
      <section className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Últimos digests</h2>
        </div>
        {tenant.digests.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhum digest gerado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tenant.digests.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-800">
                  {new Date(d.date).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <Badge variant={d.sentAt ? 'success' : 'warning'}>
                  {d.sentAt ? 'Enviado' : 'Pendente'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
