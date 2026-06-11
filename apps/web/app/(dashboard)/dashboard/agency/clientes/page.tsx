import Link from 'next/link'
import { requireRole } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, ChevronRight } from 'lucide-react'
import { CreateTenantDialog } from './_components/create-tenant-dialog'

export default async function ClientesPage() {
  const session = await requireRole(['AGENCY_ADMIN'])
  const agencyId = session.user.agencyId!

  const tenants = await prisma.tenant.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          groups: { where: { isActive: true } },
          messages: true,
        },
      },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} cliente(s) cadastrado(s)</p>
        </div>
        <CreateTenantDialog />
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500 mb-2">Nenhum cliente cadastrado ainda.</p>
          <p className="text-sm text-gray-400">
            Clique em &quot;Novo Cliente&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Grupos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Digest</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{tenant.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {tenant.whatsappPhone}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-700">{tenant._count.groups} ativo(s)</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {tenant.digestTime} · {tenant.timezone.split('/')[1]?.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={tenant.isActive ? 'success' : 'secondary'}>
                      {tenant.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/agency/clientes/${tenant.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
