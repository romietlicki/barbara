'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DigestScheduleFields } from '@/components/digest-schedule-fields'
import { updateTenantDigestSettingsAction } from '../actions'

interface Props {
  digestTime: string
  digestFrequency: string
  digestDayOfWeek: number
  digestDayOfMonth: number
  timezone: string
}

export function DigestSettingsForm({ digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTenantDigestSettingsAction(formData)
        toast.success('Configurações salvas!')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DigestScheduleFields
        defaults={{ digestTime, digestFrequency, digestDayOfWeek, digestDayOfMonth, timezone }}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
    </form>
  )
}
