export interface MessageForDigest {
  groupId: string
  author: string
  content: string
  timestamp: Date
}

export interface GroupInfo {
  id: string
  name: string
}

export interface DigestPrompt {
  system: string
  user: string
}

export function buildCoupleDigestPrompt(
  messages: MessageForDigest[],
  groups: GroupInfo[],
  coupleName: string,
  dateLabel: string,
): DigestPrompt {
  const groupMap = new Map(groups.map((g) => [g.id, g.name]))

  const formattedMessages = messages
    .map((m) => {
      const d = m.timestamp
      const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const groupName = groupMap.get(m.groupId) ?? m.groupId
      return `[${groupName}] ${date} ${time} — ${m.author}: ${m.content}`
    })
    .join('\n')

  const now = new Date()
  const sentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const system = `Você é um assistente especializado em planejamento de casamentos.
Sua função é resumir as conversas do grupo de WhatsApp do evento e destacar o que é mais importante para o casal.

Regras:
- Responda APENAS com o digest no formato exato abaixo. Nenhum texto antes ou depois.
- Foque em: prazos, aprovações de fornecedores, orçamentos, decisões pendentes e confirmações.
- Ignore mensagens triviais (saudações, emojis, "ok", "confirmado" sem contexto).
- Use linguagem acolhedora e direta para o casal.
- Escreva em português do Brasil.`

  const user = `Você é um assistente de planejamento de casamentos.
Abaixo estão as mensagens do grupo "${coupleName}" do período: ${dateLabel}.

MENSAGENS:
${formattedMessages}

Sua tarefa:
1. Escreva um RESUMO em 3-5 frases do que foi tratado
2. Liste as AÇÕES que o casal precisa tomar (máximo 5)
3. Indique o NÍVEL DE URGÊNCIA de cada ação: Alta / Média / Baixa

Formato de saída OBRIGATÓRIO:

📌 EVENTO: ${coupleName}

📝 Resumo:
[resumo aqui]

✅ Ações para o casal:
- [Alta] Ação mais urgente
- [Média] Ação importante
- [Baixa] Ação de baixa prioridade

Total: ${messages.length} mensagem(ns) · enviado às ${sentTime}`

  return { system, user }
}

export function buildDigestPrompt(
  messages: MessageForDigest[],
  groups: GroupInfo[],
  tenantName: string,
  dateLabel: string,
): DigestPrompt {
  // Agrupa mensagens por grupo
  const messagesByGroup = new Map<string, MessageForDigest[]>()
  for (const m of messages) {
    const existing = messagesByGroup.get(m.groupId) ?? []
    existing.push(m)
    messagesByGroup.set(m.groupId, existing)
  }

  // Formata seções por grupo
  const groupSections = groups
    .filter((g) => messagesByGroup.has(g.id))
    .map((g) => {
      const msgs = messagesByGroup.get(g.id)!
      const formatted = msgs
        .map((m) => {
          const time = m.timestamp.toISOString().slice(11, 16) // HH:MM UTC
          return `${time} — ${m.author}: ${m.content}`
        })
        .join('\n')
      return `=== GRUPO: ${g.name} (${msgs.length} mensagens) ===\n${formatted}`
    })
    .join('\n\n')

  const totalGroups = groups.filter((g) => messagesByGroup.has(g.id)).length

  const now = new Date()
  const sentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const system = `Você é um assistente de produtividade especializado em resumos de grupos de WhatsApp para empresas brasileiras.

Regras obrigatórias:
- Responda APENAS com o digest no formato exato abaixo. Nenhum texto antes ou depois.
- Para cada grupo, escreva um RESUMO em 3-5 frases do que foi discutido.
- Liste as AÇÕES que o cliente precisa tomar (máximo 5 por grupo).
- Indique o NÍVEL DE URGÊNCIA de cada ação: Alta / Média / Baixa.
- Ignore mensagens triviais (saudações, emojis isolados, "ok", "sim", "não").
- Escreva em português do Brasil.
- Seja objetivo e direto.`

  const user = `Você é um assistente de produtividade.
Abaixo estão as mensagens dos grupos de WhatsApp de "${tenantName}" do dia ${dateLabel}.

MENSAGENS:
${groupSections}

Sua tarefa: para CADA grupo listado acima, gere um resumo no formato abaixo.

Formato de saída OBRIGATÓRIO (repita para cada grupo):

📌 GRUPO: [nome do grupo]

📝 Resumo:
[3-5 frases resumindo o que foi discutido]

✅ Ações:
- [Alta] Ação mais urgente
- [Média] Ação importante
- [Baixa] Ação de baixa prioridade

---

Ao final de todos os grupos, adicione exatamente esta linha:
Total: ${totalGroups} grupo${totalGroups !== 1 ? 's' : ''} · [N] ações · enviado às ${sentTime}`

  return { system, user }
}
