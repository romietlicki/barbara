'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateTaskadeSettingsAction } from '../actions'

interface Props {
  taskadeWebhookUrl: string | null
}

export function TaskadeSettingsForm({ taskadeWebhookUrl }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTaskadeSettingsAction(formData)
        toast.success('Integração Taskade salva!')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="taskadeWebhookUrl">Webhook URL</Label>
        <Input
          id="taskadeWebhookUrl"
          name="taskadeWebhookUrl"
          type="url"
          placeholder="https://www.taskade.com/webhooks/flow/..."
          defaultValue={taskadeWebhookUrl ?? ''}
        />
        <p className="text-xs text-gray-500">
          No Taskade, abra o projeto → <span className="font-medium">Automações → Webhook</span> → copie a URL do fluxo.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar integração'}
        </Button>
      </div>
    </form>
  )
}
