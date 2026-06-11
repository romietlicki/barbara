'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'O que foi discutido nos grupos esta semana?',
  'Quais ações estão pendentes para os casamentos?',
  'Algum fornecedor foi aprovado recentemente?',
  'Quais casamentos têm prazo próximo?',
]

export function AiChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const newHistory = [...messages, userMsg]

    setMessages([...newHistory, { role: 'assistant', content: '' }])
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/tenant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10),
        }),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages([...newHistory, { role: 'assistant', content: assistantText }])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      setMessages([...newHistory, { role: 'assistant', content: `❌ ${errMsg}` }])
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <Bot className="h-4 w-4 text-[var(--brand)]" />
        <h2 className="font-semibold text-gray-900 text-sm">Assistente Barbara</h2>
        <span className="text-xs text-gray-400 ml-1">— consulte as conversas dos grupos com IA</span>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[420px]">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 text-center py-4">
              Faça uma pergunta sobre as conversas dos seus grupos de WhatsApp.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-gray-100
                             border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                ${msg.role === 'user'
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-gray-100 text-gray-500'}`}>
                {msg.role === 'user'
                  ? <User className="h-3.5 w-3.5" />
                  : <Bot className="h-3.5 w-3.5" />}
              </div>

              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm
                ${msg.role === 'user'
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-gray-50 border border-gray-100 text-gray-800'}`}>
                {msg.role === 'assistant' ? (
                  msg.content ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre os grupos, casais, fornecedores... (Enter para enviar)"
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent
                     disabled:opacity-50 transition-shadow placeholder:text-gray-400"
          style={{ minHeight: '38px', maxHeight: '120px' }}
          onInput={(e) => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = `${t.scrollHeight}px`
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isStreaming || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg
                     bg-[var(--brand)] text-white hover:opacity-90
                     disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
        >
          {isStreaming
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
