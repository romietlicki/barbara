import { prisma } from '@repo/db'
import type { Agency } from '@repo/db'

// Busca agência pelo slug para aplicar theming white-label.
// Retorna null para slug desconhecido — o layout usa fallback de cores.
export async function getAgencyBySlug(slug: string): Promise<Agency | null> {
  if (!slug || slug === 'default') return null

  return prisma.agency.findUnique({
    where: { slug },
  })
}

// Retorna as CSS variables de branding para injetar no <body>
export function buildBrandingStyle(
  agency: Agency | null,
): React.CSSProperties {
  const primaryColor = agency?.primaryColor ?? '#6366f1'
  return {
    '--brand': primaryColor,
    '--brand-foreground': '#ffffff',
    '--radius': '0.5rem',
  } as React.CSSProperties
}
