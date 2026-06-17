'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateTenantDigestEmailAction } from '../actions'

export function DigestEmailForm({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTenantDigestEmailAction(formData)
        toast.success('Email atualizado!')
        setEditing(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Email para receber o digest</p>
          <p className="text-sm font-medium text-gray-900">{currentEmail || '—'}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="py-2">
      <p className="text-xs text-gray-400 mb-1.5">Email para receber o digest</p>
      <div className="flex items-center gap-2">
        <Input
          name="email"
          type="email"
          defaultValue={currentEmail}
          placeholder="seu@email.com"
          required
          autoFocus
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={isPending} className="gap-1">
          <Check className="h-3.5 w-3.5" />
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setEditing(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  )
}
