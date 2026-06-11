import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import { getAgencyBySlug, buildBrandingStyle } from '@/lib/agency'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Barbara',
  description: 'Resumos diários dos seus grupos de WhatsApp',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const slug = headersList.get('x-agency-slug') ?? 'default'

  // Busca branding white-label; fallback para cores padrão se slug desconhecido
  const agency = await getAgencyBySlug(slug)
  const brandingStyle = buildBrandingStyle(agency)

  return (
    <html lang="pt-BR">
      <body className={inter.className} style={brandingStyle}>
        {children}
      </body>
    </html>
  )
}
