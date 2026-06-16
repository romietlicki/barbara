'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QrConnect } from '@/components/qr-connect'
import { createTenantAction } from '@/app/(dashboard)/dashboard/agency/clientes/actions'

type Step = 1 | 2 | 3

const STEPS = [
  { num: 1, label: 'Boas-vindas' },
  { num: 2, label: 'Primeiro cliente' },
  { num: 3, label: 'Conectar WhatsApp' },
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
  { value: 'America/Recife', label: 'Recife (UTC-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (UTC-4)' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1)
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null)
  const [createdTenantName, setCreatedTenantName] = useState('')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  function handleCreateTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('timezone', timezone)
    const name = formData.get('name') as string

    startTransition(async () => {
      try {
        const result = await createTenantAction(formData)
        setCreatedTenantId(result.id)
        setCreatedTenantName(name)
        setStep(3)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar cliente')
      }
    })
  }

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step > s.num
                    ? 'bg-green-500 text-white'
                    : step === s.num
                    ? 'bg-[var(--brand)] text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  step === s.num ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8">
        {/* Step 1: Boas-vindas */}
        {step === 1 && (
          <div className="text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white text-2xl font-bold"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              W
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo!</h1>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Vamos configurar sua conta em 3 passos rápidos. Você vai cadastrar seu primeiro
              cliente e conectar o WhatsApp dele para começar a monitorar grupos.
            </p>
            <div className="space-y-3 text-left mb-8">
              {[
                'Cadastrar primeiro cliente',
                'Conectar o WhatsApp do cliente',
                'Ativar grupos para monitorar',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 shrink-0">
                    {i + 1}
                  </div>
                  {item}
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              Começar configuração
            </Button>
          </div>
        )}

        {/* Step 2: Criar primeiro cliente */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Cadastrar primeiro cliente</h2>
            <p className="text-sm text-gray-500 mb-5">
              Preencha os dados do seu primeiro cliente.
            </p>

            <form ref={formRef} onSubmit={handleCreateTenant} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome da empresa *</Label>
                <Input id="name" name="name" placeholder="Empresa Exemplo Ltda" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email do cliente *</Label>
                <Input id="email" name="email" type="email" placeholder="contato@empresa.com" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsappPhone">WhatsApp (apenas dígitos) *</Label>
                <Input
                  id="whatsappPhone"
                  name="whatsappPhone"
                  placeholder="5511999999999"
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="digestTime">Horário do digest *</Label>
                  <Input id="digestTime" name="digestTime" type="time" defaultValue="18:00" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Fuso horário *</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? 'Criando...' : 'Criar cliente'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Conectar WhatsApp */}
        {step === 3 && createdTenantId && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Conectar WhatsApp</h2>
            <p className="text-sm text-gray-500 mb-2">
              Conecte o WhatsApp de <strong>{createdTenantName}</strong>.
            </p>

            <QrConnect
              tenantId={createdTenantId}
              tenantName={createdTenantName}
              onConnected={() => router.push('/dashboard/agency')}
            />

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/agency')}
              >
                Pular por agora
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
