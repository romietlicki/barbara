import type { Criticality } from '@repo/taskade'

const CRITICALITY_LABEL: Record<Criticality, string> = {
  Alta: 'Alta',
  Média: 'Média',
  Baixa: 'Baixa',
}

async function trelloFetch(method: string, path: string, apiKey: string, token: string, body?: object): Promise<unknown> {
  const url = new URL(`https://api.trello.com/1${path}`)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('token', token)

  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Trello API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export async function createTrelloCard(
  apiKey: string,
  token: string,
  listId: string,
  content: string,
  criticality: Criticality,
): Promise<void> {
  const name = `[${CRITICALITY_LABEL[criticality]}] ${content}`
  await trelloFetch('POST', '/cards', apiKey, token, { name, idList: listId })
}

export async function createCoupleCard(
  apiKey: string,
  token: string,
  listId: string,
  coupleName: string,
): Promise<string> {
  const card = await trelloFetch('POST', '/cards', apiKey, token, {
    name: coupleName,
    idList: listId,
  }) as { id: string }
  return card.id
}

// ── Checklists ────────────────────────────────────────────────────────────────

export interface TrelloChecklist {
  id: string
  name: string
  checkItems: { id: string; name: string }[]
}

export async function getCardChecklists(
  apiKey: string,
  token: string,
  cardId: string,
): Promise<TrelloChecklist[]> {
  return trelloFetch('GET', `/cards/${cardId}/checklists`, apiKey, token) as Promise<TrelloChecklist[]>
}

export async function createChecklist(
  apiKey: string,
  token: string,
  cardId: string,
  name: string,
): Promise<string> {
  const checklist = await trelloFetch('POST', '/checklists', apiKey, token, {
    idCard: cardId,
    name,
  }) as { id: string }
  return checklist.id
}

export async function addChecklistItem(
  apiKey: string,
  token: string,
  checklistId: string,
  name: string,
): Promise<void> {
  await trelloFetch('POST', `/checklists/${checklistId}/checkItems`, apiKey, token, { name })
}
