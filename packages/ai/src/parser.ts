// Remove artefatos que o Claude ocasionalmente inclui antes/depois do markdown
export function parseDigestOutput(raw: string): string {
  let content = raw.trim()

  // Remove blocos de código markdown envolvendo o digest (```markdown ... ```)
  const codeBlockMatch = content.match(/^```(?:markdown)?\s*\n([\s\S]*?)\n?```\s*$/i)
  if (codeBlockMatch?.[1]) {
    content = codeBlockMatch[1].trim()
  }

  // Garante que começa com o cabeçalho esperado
  if (!content.startsWith('## Digest')) {
    const headingIdx = content.indexOf('## Digest')
    if (headingIdx > 0) {
      content = content.slice(headingIdx)
    }
  }

  return content
}
