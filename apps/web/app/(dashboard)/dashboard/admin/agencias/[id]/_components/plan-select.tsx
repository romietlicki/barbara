'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { updateAgencyPlanAction } from '../../actions'
import type { PlanStatus } from '@repo/db'

const OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: 'TRIAL',    label: 'Trial' },
  { value: 'ACTIVE',   label: 'Ativo' },
  { value: 'PAST_DUE', label: 'Atrasado' },
  { value: 'CANCELED', label: 'Cancelado' },
]

interface Props {
  agencyId: string
  current: PlanStatus
}

export function PlanSelect({ agencyId, current }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as PlanStatus
    startTransition(async () => {
      try {
        await updateAgencyPlanAction(agencyId, value)
        toast.success('Plano atualizado')
      } catch {
        toast.error('Erro ao atualizar plano')
      }
    })
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={isPending}
      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white
                 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]
                 disabled:opacity-50 cursor-pointer"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
