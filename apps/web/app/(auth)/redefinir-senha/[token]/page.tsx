'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { confirmPasswordResetAction } from '@/lib/actions/password-reset'

export default function RedefinirSenhaPage({ params }: { params: { token: string } }) {
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('token', params.token)

    startTransition(async () => {
      const res = await confirmPasswordResetAction(null, formData)
      setResult(res)
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
          <p className="text-sm text-gray-500 mt-1">
            Escolha uma senha com pelo menos 8 caracteres
          </p>
        </div>

        {result?.success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{result.success}</p>
            <div className="text-center mt-3">
              <Link href="/login" className="text-sm font-medium text-[var(--brand)] hover:underline">
                Ir para o login
              </Link>
            </div>
          </div>
        )}

        {result?.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{result.error}</p>
          </div>
        )}

        {!result?.success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nova senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[var(--brand)]
                           focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar nova senha
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-[var(--brand)]
                           focus:border-transparent transition-shadow"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-[var(--brand)] text-[var(--brand-foreground)]
                         rounded-lg text-sm font-medium hover:opacity-90
                         disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isPending ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
