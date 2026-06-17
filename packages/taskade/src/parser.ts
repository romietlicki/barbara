export type Criticality = 'Alta' | 'Média' | 'Baixa'

export interface DigestAction {
  content: string
  criticality: Criticality
}

const ACTION_REGEX = /^-\s+\[(Alta|Média|Baixa)\]\s+(.+)$/gm

export function parseActionsFromDigest(contentMd: string): DigestAction[] {
  const actions: DigestAction[] = []
  let match: RegExpExecArray | null

  while ((match = ACTION_REGEX.exec(contentMd)) !== null) {
    const criticality = match[1]
    const content = match[2]
    if (!criticality || !content) continue
    actions.push({ criticality: criticality as Criticality, content: content.trim() })
  }

  return actions
}
