import type { Criticality } from '@repo/taskade'

const CRITICALITY_LABEL: Record<Criticality, string> = {
  Alta: 'Alta',
  Média: 'Média',
  Baixa: 'Baixa',
}

export async function createTrelloCard(
  apiKey: string,
  token: string,
  listId: string,
  content: string,
  criticality: Criticality,
): Promise<void> {
  const label = CRITICALITY_LABEL[criticality]
  const name = `[${label}] ${content}`

  const url = new URL('https://api.trello.com/1/cards')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('token', token)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, idList: listId }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Trello API error ${res.status}: ${body}`)
  }
}
