import { requireRole } from '@/lib/auth-context'
import { Toaster } from 'sonner'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['AGENCY_ADMIN'])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {children}
      <Toaster richColors position="top-right" />
    </div>
  )
}
