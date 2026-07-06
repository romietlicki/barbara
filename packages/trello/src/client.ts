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

export async function createTrelloBoard(
  apiKey: string,
  token: string,
  name: string,
): Promise<{ boardId: string; listId: string; boardUrl: string }> {
  // Cria o board sem listas padrão (To Do / Doing / Done)
  const board = await trelloFetch('POST', '/boards', apiKey, token, {
    name,
    defaultLists: false,
  }) as { id: string; shortUrl: string }

  // Cria uma lista "Ações" no board recém-criado
  const list = await trelloFetch('POST', '/lists', apiKey, token, {
    name: 'Ações',
    idBoard: board.id,
  }) as { id: string }

  return { boardId: board.id, listId: list.id, boardUrl: board.shortUrl }
}
