import type { Criticality } from './parser'

const PRIORITY_MAP: Record<Criticality, string> = {
  Alta: 'high',
  Média: 'medium',
  Baixa: 'low',
}

export async function createTaskadeTask(
  webhookUrl: string,
  content: string,
  criticality: Criticality,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: content,
      priority: PRIORITY_MAP[criticality],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Taskade webhook error ${res.status}: ${body}`)
  }
}
