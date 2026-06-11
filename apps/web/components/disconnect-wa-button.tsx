'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { disconnectWhatsAppAction } from '@/lib/actions/whatsapp'

export function DisconnectWaButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDisconnect() {
    startTransition(async () => {
      try {
        await disconnectWhatsAppAction(tenantId)
        toast.success('WhatsApp desconectado.')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao desconectar')
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDisconnect}
      disabled={isPending}
    >
      <WifiOff className="h-4 w-4" />
      {isPending ? 'Desconectando...' : 'Desconectar WA'}
    </Button>
  )
}
