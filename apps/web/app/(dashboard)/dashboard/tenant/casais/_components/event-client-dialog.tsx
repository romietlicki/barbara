'use client'

import { useRef, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
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
import { createEventClientAction, updateEventClientAction } from '../actions'

interface EventClientData {
  id: string
  name: string
  phone: string
  email: string
  description: string
  digestTime: string
  digestFrequency: string
  digestDayOfWeek: number
  digestDayOfMonth: number
  timezone: string
}

interface Props {
  mode: 'create' | 'edit'
  defaultValues?: EventClientData
}

export function EventClientDialog({ mode, defaultValues }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (mode === 'create') {
          await createEventClientAction(formData)
          toast.success('Casal cadastrado!')
        } else {
          await updateEventClientAction(defaultValues!.id, formData)
          toast.success('Dados atualizados!')
        }
        setOpen(false)
        formRef.current?.reset()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button size="sm"><Plus className="h-4 w-4" />Novo casal</Button>
        ) : (
          <Button variant="outline" size="sm"><Pencil className="h-4 w-4" />Editar</Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Cadastrar casal' : 'Editar casal'}</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Nome do casal *</Label>
            <Input id="ec-name" name="name" placeholder="João & Maria Silva"
              defaultValue={defaultValues?.name} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-phone">Telefone *</Label>
            <Input id="ec-phone" name="phone" type="tel" inputMode="numeric"
              placeholder="5511999999999" defaultValue={defaultValues?.phone} required />
            <p className="text-xs text-gray-400">Apenas dígitos com DDD e código do país</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-email">Email para receber o resumo *</Label>
            <Input id="ec-email" name="email" type="email"
              placeholder="casal@email.com" defaultValue={defaultValues?.email} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-description">Descrição do evento</Label>
            <textarea id="ec-description" name="description" rows={2} maxLength={500}
              placeholder="Casamento em 15/08/2026, Salão Primavera..."
              defaultValue={defaultValues?.description}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-[var(--brand)]
                         focus:border-transparent transition-shadow" />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <DigestScheduleFields
              label="Agendamento do resumo para o casal"
              defaults={{
                digestTime: defaultValues?.digestTime ?? '08:00',
                digestFrequency: defaultValues?.digestFrequency ?? 'daily',
                digestDayOfWeek: defaultValues?.digestDayOfWeek ?? 1,
                digestDayOfMonth: defaultValues?.digestDayOfMonth ?? 1,
                timezone: defaultValues?.timezone ?? 'America/Sao_Paulo',
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : mode === 'create' ? 'Cadastrar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
