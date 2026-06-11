import { prisma } from '@repo/db'

export default async function globalSetup() {
  try {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@acme.com' } })
    if (!admin) {
      console.error('[e2e] Seed não encontrado. Execute: pnpm db:seed')
      process.exit(1)
    }
    console.log('[e2e] Seed verificado — usuários de teste presentes')
  } finally {
    await prisma.$disconnect()
  }
}
