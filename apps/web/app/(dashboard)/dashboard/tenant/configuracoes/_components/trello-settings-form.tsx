'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateTrelloSettingsAction } from '../actions'

interface Props {
  trelloApiKey: string | null
  trelloToken: string | null
  trelloListId: string | null
}

export function TrelloSettingsForm({ trelloApiKey, trelloToken, trelloListId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTrelloSettingsAction(formData)
        toast.success('Integração Trello salva!')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="trelloApiKey">API Key</Label>
        <Input
          id="trelloApiKey"
          name="trelloApiKey"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          defaultValue={trelloApiKey ?? ''}
        />
        <p className="text-xs text-gray-500">
          Acesse <span className="font-medium">trello.com/app-key</span> e copie a chave.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trelloToken">Token</Label>
        <Input
          id="trelloToken"
          name="trelloToken"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          defaultValue={trelloToken ?? ''}
        />
        <p className="text-xs text-gray-500">
          Na mesma página, clique em <span className="font-medium">Token</span> e autorize o acesso.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trelloListId">ID da Lista</Label>
        <Input
          id="trelloListId"
          name="trelloListId"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
          defaultValue={trelloListId ?? ''}
        />
        <p className="text-xs text-gray-500">
          Abra o board no Trello, adicione <span className="font-medium">.json</span> ao final da URL e localize o campo <span className="font-medium">"id"</span> dentro de <span className="font-medium">"lists"</span> na lista desejada.
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
