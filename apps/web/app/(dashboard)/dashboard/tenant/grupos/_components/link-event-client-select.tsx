'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { linkGroupToEventClientAction } from '../../casais/actions'

interface EventClientOption {
  id: string
  name: string
}

interface Props {
  groupId: string
  currentEventClientId: string | null
  options: EventClientOption[]
}

export function LinkEventClientSelect({ groupId, currentEventClientId, options }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null
    startTransition(async () => {
      try {
        await linkGroupToEventClientAction(groupId, value)
        toast.success(value ? 'Casal vinculado!' : 'Vínculo removido')
        router.refresh()
      } catch {
        toast.error('Erro ao vincular')
      }
    })
  }

  return (
    <select
      value={currentEventClientId ?? ''}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600
                 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]
                 disabled:opacity-50 cursor-pointer max-w-[160px]"
    >
      <option value="">— Sem casal —</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  )
}
