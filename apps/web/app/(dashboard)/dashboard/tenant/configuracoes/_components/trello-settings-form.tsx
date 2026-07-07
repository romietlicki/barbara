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
  trelloScheduleHours: number
}

const SCHEDULE_OPTIONS = [
  { value: '1', label: 'A cada 1 hora' },
  { value: '2', label: 'A cada 2 horas' },
  { value: '4', label: 'A cada 4 horas' },
  { value: '6', label: 'A cada 6 horas' },
  { value: '12', label: 'A cada 12 horas' },
  { value: '24', label: 'Uma vez ao dia' },
]

export function TrelloSettingsForm({ trelloApiKey, trelloToken, trelloListId, trelloScheduleHours }: Props) {
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
        <Label htmlFor="trelloListId">
          ID da Lista{' '}
          <span className="text-gray-400 font-normal">(opcional)</span>
        </Label>
        <Input
          id="trelloListId"
          name="trelloListId"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
          defaultValue={trelloListId ?? ''}
        />
        <p className="text-xs text-gray-500">
          Necessário apenas para exportar o <span className="font-medium">digest de gestão</span> (grupos não
          vinculados a casais). Os boards por casal são criados automaticamente — este campo não afeta eles.
        </p>
        <p className="text-xs text-gray-400">
          Para obter o ID: acesse{' '}
          <span className="font-mono break-all select-all">
            https://api.trello.com/1/boards/ID_DO_BOARD/lists?key=SUA_KEY&token=SEU_TOKEN
          </span>
          {' '}— o <span className="font-medium">ID_DO_BOARD</span> fica na URL do board (ex:{' '}
          <span className="font-mono">trello.com/b/<strong>AbCdEfGh</strong>/nome</span>).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trelloScheduleHours">Frequência de exportação</Label>
        <select
          id="trelloScheduleHours"
          name="trelloScheduleHours"
          defaultValue={String(trelloScheduleHours)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SCHEDULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Com que frequência o sistema verifica novos cards para criar no Trello.
          Ações já exportadas nunca são duplicadas.
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
