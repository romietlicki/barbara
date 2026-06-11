'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { tenantToggleGroupAction } from '../actions'

interface Props {
  groupId: string
  isActive: boolean
}

export function TenantToggleGroupButton({ groupId, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      try {
        await tenantToggleGroupAction(groupId)
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
