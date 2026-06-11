'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteAgencyAction } from '../../actions'

interface Props {
  agencyId: string
  agencyName: string
}

export function DeleteAgencyButton({ agencyId, agencyName }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAgencyAction(agencyId)
        toast.success('Agência excluída')
        router.push('/dashboard/admin/agencias')
      } catch {
        toast.error('Erro ao excluir agência')
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}
        className="text-red-600 border-red-200 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
        Excluir agência
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir agência</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir <strong>{agencyName}</strong>?
            Todos os clientes, grupos, mensagens e digests serão removidos permanentemente.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
