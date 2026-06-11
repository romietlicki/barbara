import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'
import type { Role } from '@repo/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            agencyId: true,
            tenantId: true,
            passwordHash: true,
          },
        })

        if (!user?.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!isValid) return null

        // Nunca retornar passwordHash para o token JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
          agencyId: user.agencyId,
          tenantId: user.tenantId,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Campos adicionais persistidos no JWT — adicionados apenas no login inicial
        token.role = user.role as Role
        token.agencyId = user.agencyId as string | null
        token.tenantId = user.tenantId as string | null
      }
      return token
    },

    session({ session, token }) {
      // token.role/agencyId/tenantId são campos customizados — beta.20 não resolve
      // a augmentation de 'next-auth/jwt' corretamente, então usamos cast explícito.
      // TODO: remover os casts quando NextAuth v5 sair de beta
      const t = token as typeof token & {
        role?: Role
        agencyId?: string | null
        tenantId?: string | null
      }
      session.user.id = t.sub ?? ''
      session.user.role = t.role ?? 'TENANT_USER'
      session.user.agencyId = t.agencyId ?? null
      session.user.tenantId = t.tenantId ?? null
      return session
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutos
    // TODO: Implementar refresh token httpOnly cookie para sessões mais longas
    // Por ora, o NextAuth renova o token automaticamente a cada request (updateAge: 0)
    updateAge: 0,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
})
