'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resendDigestAction } from '../actions'

export function ResendDigestButton({ digestId }: { digestId: string }) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    try {
      await resendDigestAction(digestId)
      toast.success('Digest reenfileirado para envio')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reenviar')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={pending}
      className="gap-1.5"
    >
      <Send className="h-3.5 w-3.5" />
      {pending ? 'Enviando...' : 'Reenviar'}
    </Button>
  )
}
