'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleGroupActiveAction } from '../actions'

interface Props {
  groupId: string
  tenantId: string
  isActive: boolean
}

export function ToggleGroupButton({ groupId, tenantId, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleGroupActiveAction(groupId, tenantId)
        toast.success(isActive ? 'Grupo desativado' : 'Grupo ativado')
      } catch {
        toast.error('Erro ao atualizar grupo')
      }
    })
  }

  return (
    <Button
      variant={isActive ? 'outline' : 'default'}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      {isPending ? '...' : isActive ? 'Desativar' : 'Ativar'}
    </Button>
  )
}
