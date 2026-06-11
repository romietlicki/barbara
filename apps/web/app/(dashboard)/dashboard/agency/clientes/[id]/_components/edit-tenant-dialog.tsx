'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DigestScheduleFields } from '@/components/digest-schedule-fields'
import { updateTenantAction } from '../../actions'

interface Props {
  tenantId: string
  defaultValues: {
    name: string
    email: string
    whatsappPhone: string
    digestTime: string
    digestFrequency: string
    digestDayOfWeek: number
    digestDayOfMonth: number
    timezone: string
  }
}

export function EditTenantDialog({ tenantId, defaultValues }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTenantAction(tenantId, formData)
        toast.success('Cliente atualizado!')
        setOpen(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao atualizar cliente')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nome da empresa *</Label>
            <Input id="edit-name" name="name" defaultValue={defaultValues.name} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email para receber o resumo *</Label>
            <Input id="edit-email" name="email" type="email" defaultValue={defaultValues.email} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">WhatsApp (apenas dígitos)</Label>
            <Input id="edit-phone" name="whatsappPhone" defaultValue={defaultValues.whatsappPhone}
              inputMode="numeric" placeholder="Preenchido automaticamente ao conectar" />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <DigestScheduleFields
              label="Agendamento do resumo de gestão"
              defaults={{
                digestTime: defaultValues.digestTime,
                digestFrequency: defaultValues.digestFrequency,
                digestDayOfWeek: defaultValues.digestDayOfWeek,
                digestDayOfMonth: defaultValues.digestDayOfMonth,
                timezone: defaultValues.timezone,
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
