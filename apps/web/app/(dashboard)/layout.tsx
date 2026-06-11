import { requireAuth } from '@/lib/auth-context'
import { prisma } from '@repo/db'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from 'sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()
  const { user } = session

  let agencyName: string | undefined
  if (user.agencyId) {
    const agency = await prisma.agency.findUnique({
      where: { id: user.agencyId },
      select: { name: true },
    })
    agencyName = agency?.name
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={user.role} userName={user.name} agencyName={agencyName} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
