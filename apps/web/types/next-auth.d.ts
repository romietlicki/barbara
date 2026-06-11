import type { Role } from '@repo/db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      agencyId: string | null
      tenantId: string | null
    }
  }

  interface User {
    role: Role
    agencyId: string | null
    tenantId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    agencyId: string | null
    tenantId: string | null
  }
}
