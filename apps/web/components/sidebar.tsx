'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Building2,
  LogOut,
  Smartphone,
  CreditCard,
  Wifi,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@repo/db'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { label: 'Visão Geral', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Agências', href: '/dashboard/admin/agencias', icon: Building2 },
  ],
  AGENCY_ADMIN: [
    { label: 'Visão Geral', href: '/dashboard/agency', icon: LayoutDashboard },
    { label: 'Clientes', href: '/dashboard/agency/clientes', icon: Users },
    { label: 'Plano & Cobrança', href: '/dashboard/agency/billing', icon: CreditCard },
  ],
  TENANT_USER: [
    { label: 'Visão Geral', href: '/dashboard/tenant', icon: LayoutDashboard },
    { label: 'Casais / Eventos', href: '/dashboard/tenant/casais', icon: Users },
    { label: 'Grupos', href: '/dashboard/tenant/grupos', icon: Smartphone },
    { label: 'Digests', href: '/dashboard/tenant/digests', icon: MessageSquare },
    { label: 'Equipe', href: '/dashboard/tenant/equipe', icon: Users },
    { label: 'WhatsApp', href: '/dashboard/tenant/conectar', icon: Wifi },
    { label: 'Configurações', href: '/dashboard/tenant/configuracoes', icon: Settings },
  ],
  TENANT_VIEWER: [
    { label: 'Visão Geral', href: '/dashboard/tenant', icon: LayoutDashboard },
    { label: 'Casais / Eventos', href: '/dashboard/tenant/casais', icon: Users },
    { label: 'Grupos', href: '/dashboard/tenant/grupos', icon: Smartphone },
    { label: 'Digests', href: '/dashboard/tenant/digests', icon: MessageSquare },
  ],
}

interface SidebarProps {
  role: Role
  userName: string
  agencyName?: string
}

export function Sidebar({ role, userName, agencyName }: SidebarProps) {
  const pathname = usePathname()
  const navItems = NAV_BY_ROLE[role]

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md text-white text-xs font-bold"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          B
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {agencyName ?? 'Barbara'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard/agency' || item.href === '/dashboard/tenant' || item.href === '/dashboard/admin'
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-400">
            {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'AGENCY_ADMIN' ? 'Agência' : role === 'TENANT_VIEWER' ? 'Visualizador' : 'Cliente'}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
