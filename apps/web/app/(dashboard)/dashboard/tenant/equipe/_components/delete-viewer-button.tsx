'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteViewerAction } from '../actions'

interface Props {
  userId: string
  name: string
}

export function DeleteViewerButton({ userId, name }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Remover o acesso de "${name}"?`)) return
    startTransition(async () => {
      try {
        await deleteViewerAction(userId)
        toast.success('Colaborador removido')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao remover')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
