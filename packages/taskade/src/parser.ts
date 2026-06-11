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
    actions.push({
      criticality: match[1] as Criticality,
      content: match[2].trim(),
    })
  }

  return actions
}
