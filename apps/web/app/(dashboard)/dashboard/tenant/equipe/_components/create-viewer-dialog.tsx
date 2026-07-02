'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createViewerAction } from '../actions'

export function CreateViewerDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      try {
        await createViewerAction(formData)
        toast.success('Colaborador adicionado com sucesso')
        setOpen(false)
        form.reset()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar colaborador')
      }
    })
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        Adicionar colaborador
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Novo colaborador</h2>
        <p className="text-sm text-gray-500 mb-5">
          Acesso de leitura — pode visualizar dados mas não pode editar configurações.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="viewer-name">Nome</Label>
            <Input
              id="viewer-name"
              name="name"
              placeholder="Nome do colaborador"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="viewer-email">Email</Label>
            <Input
              id="viewer-email"
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="viewer-password">Senha temporária</Label>
            <Input
              id="viewer-password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar acesso'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
