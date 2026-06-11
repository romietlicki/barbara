'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { connectWhatsAppAction, getWaStatusAction } from '@/lib/actions/whatsapp'

type ConnectState =
  | { type: 'loading' }
  | { type: 'qr'; base64: string }
  | { type: 'connected' }
  | { type: 'error'; message: string }

const POLL_INTERVAL = 3000 // 3s

export function QrConnect({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [state, setState] = useState<ConnectState>({ type: 'loading' })
  const router = useRouter()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadQr() {
    setState({ type: 'loading' })
    try {
      const result = await connectWhatsAppAction(tenantId)

      if (result.status === 'open') {
        setState({ type: 'connected' })
        return
      }

      if (result.qrBase64) {
        setState({ type: 'qr', base64: result.qrBase64 })
        startPolling()
      } else {
        setState({ type: 'error', message: 'Não foi possível obter o QR code.' })
      }
    } catch (err) {
      setState({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    }
  }

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { state: waState } = await getWaStatusAction(tenantId)
        if (waState === 'open') {
          clearInterval(pollRef.current!)
          setState({ type: 'connected' })
          setTimeout(() => router.push(`/dashboard/agency/clientes/${tenantId}`), 2000)
        }
      } catch {
        // silencia erros de polling — QR ainda válido
      }
    }, POLL_INTERVAL)
  }

  useEffect(() => {
    loadQr()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {state.type === 'loading' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-gray-300" />
          <p className="text-sm text-gray-500">Iniciando conexão...</p>
        </>
      )}

      {state.type === 'qr' && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.base64.startsWith('data:') ? state.base64 : `data:image/png;base64,${state.base64}`}
              alt="QR Code WhatsApp"
              width={240}
              height={240}
              className="rounded"
            />
          </div>

          <div className="text-center max-w-xs">
            <p className="font-medium text-gray-900 mb-1">Escaneie com o WhatsApp</p>
            <ol className="text-sm text-gray-500 text-left space-y-1 list-decimal list-inside">
              <li>Abra o WhatsApp no celular</li>
              <li>Toque em ⋮ → Aparelhos conectados</li>
              <li>Toque em &quot;Conectar um aparelho&quot;</li>
              <li>Escaneie o QR code acima</li>
            </ol>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando conexão de <strong>{tenantName}</strong>...
          </div>

          <Button variant="outline" size="sm" onClick={loadQr}>
            <RefreshCw className="h-3.5 w-3.5" />
            Novo QR code
          </Button>
        </>
      )}

      {state.type === 'connected' && (
        <>
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-lg">Conectado!</p>
            <p className="text-sm text-gray-500 mt-1">
              WhatsApp de <strong>{tenantName}</strong> conectado com sucesso.
            </p>
          </div>
          <Button onClick={() => router.push(`/dashboard/agency/clientes/${tenantId}`)}>
            Voltar ao cliente
          </Button>
        </>
      )}

      {state.type === 'error' && (
        <>
          <AlertCircle className="h-10 w-10 text-red-400" />
          <div className="text-center">
            <p className="font-medium text-gray-900">Falha na conexão</p>
            <p className="text-sm text-gray-500 mt-1">{state.message}</p>
          </div>
          <Button variant="outline" onClick={loadQr}>
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </>
      )}
    </div>
  )
}
