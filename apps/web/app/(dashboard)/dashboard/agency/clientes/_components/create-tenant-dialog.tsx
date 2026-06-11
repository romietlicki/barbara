'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
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
import { createTenantAction } from '../actions'

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await createTenantAction(formData)
        toast.success('Cliente criado com sucesso!')
        setOpen(false)
        formRef.current?.reset()
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar cliente')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome da empresa *</Label>
            <Input id="name" name="name" placeholder="Empresa Exemplo Ltda" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email para receber o resumo *</Label>
            <Input id="email" name="email" type="email" placeholder="contato@empresa.com" required />
            <p className="text-xs text-gray-400">
              O resumo será enviado para este endereço. Também cria acesso ao painel.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsappPhone">WhatsApp (apenas dígitos)</Label>
            <Input id="whatsappPhone" name="whatsappPhone" placeholder="5511999999999" inputMode="numeric" />
            <p className="text-xs text-gray-400">Opcional — preenchido automaticamente ao conectar</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <DigestScheduleFields
              label="Agendamento do resumo de gestão"
              defaults={{ digestTime: '18:00' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
