import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((request: NextRequest & { auth: unknown }) => {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''

  // Extrai o slug da agência do subdomínio para white-label theming
  const rootDomain = process.env['NEXT_PUBLIC_ROOT_DOMAIN'] ?? 'localhost:3000'
  const slug = extractAgencySlug(hostname, rootDomain)

  // Redireciona para login se tentar acessar área protegida sem sessão
  const isProtectedRoute = pathname.startsWith('/dashboard')
  const isAuthRoute = pathname.startsWith('/login')
  const hasSession = !!(request as { auth: unknown }).auth

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Injeta o slug nos headers para server components lerem via headers()
  const response = NextResponse.next()
  response.headers.set('x-agency-slug', slug)
  return response
})

function extractAgencySlug(hostname: string, rootDomain: string): string {
  // Em desenvolvimento (localhost), usa variável de ambiente como fallback
  if (hostname === 'localhost:3000' || hostname === rootDomain) {
    return process.env['DEV_AGENCY_SLUG'] ?? 'default'
  }

  // Remove porta se presente, extrai primeiro segmento
  const host = hostname.split(':')[0] ?? hostname
  const parts = host.split('.')

  // acme.seuapp.com → "acme"
  // localhost → "default"
  if (parts.length >= 3) {
    return parts[0] ?? 'default'
  }

  return 'default'
}

export const config = {
  matcher: [
    // Aplica o middleware em todas as rotas exceto assets estáticos e _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
