'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
  { value: 'America/Recife', label: 'Recife (UTC-3)' },
  { value: 'America/Bahia', label: 'Salvador (UTC-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (UTC-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
]

const DAYS_OF_WEEK = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
]

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `Dia ${i + 1}`,
}))

interface Props {
  defaults?: {
    digestTime?: string
    timezone?: string
    digestFrequency?: string
    digestDayOfWeek?: number
    digestDayOfMonth?: number
  }
  label?: string
}

export function DigestScheduleFields({ defaults, label }: Props) {
  const [frequency, setFrequency] = useState(defaults?.digestFrequency ?? 'daily')
  const [timezone, setTimezone] = useState(defaults?.timezone ?? 'America/Sao_Paulo')
  const [dayOfWeek, setDayOfWeek] = useState(String(defaults?.digestDayOfWeek ?? 1))
  const [dayOfMonth, setDayOfMonth] = useState(String(defaults?.digestDayOfMonth ?? 1))

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="digestFrequency">Frequência *</Label>
          <Select value={frequency} onValueChange={setFrequency} name="digestFrequency">
            <SelectTrigger id="digestFrequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
          {/* hidden input para o FormData */}
          <input type="hidden" name="digestFrequency" value={frequency} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="digestTime">Horário *</Label>
          <Input
            id="digestTime"
            name="digestTime"
            type="time"
            defaultValue={defaults?.digestTime ?? '08:00'}
            required
          />
        </div>
      </div>

      {frequency === 'weekly' && (
        <div className="space-y-1.5">
          <Label>Dia da semana *</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="digestDayOfWeek" value={dayOfWeek} />
        </div>
      )}

      {frequency === 'monthly' && (
        <div className="space-y-1.5">
          <Label>Dia do mês *</Label>
          <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS_OF_MONTH.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="digestDayOfMonth" value={dayOfMonth} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Fuso horário *</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="timezone" value={timezone} />
      </div>
    </div>
  )
}
