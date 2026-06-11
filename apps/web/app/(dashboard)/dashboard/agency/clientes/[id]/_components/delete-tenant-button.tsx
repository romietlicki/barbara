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
  DialogDescription,
} from '@/components/ui/dialog'
import { deleteTenantAction } from '../../actions'

export function DeleteTenantButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTenantAction(tenantId)
        toast.success('Cliente removido.')
        router.push('/dashboard/agency/clientes')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao remover cliente')
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        Remover
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover cliente</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os grupos, mensagens e digests de{' '}
              <strong>{tenantName}</strong> serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Removendo...' : 'Remover definitivamente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
