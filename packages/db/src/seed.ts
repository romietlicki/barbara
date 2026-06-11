import { prisma } from './index.js'
import bcrypt from 'bcryptjs'

async function main(): Promise<void> {
  // Seed idempotente — aborta se dados já existem
  const existing = await prisma.agency.findUnique({ where: { slug: 'acme' } })
  if (existing) {
    console.log('Seed já executado, pulando...')
    return
  }

  const HASH_ROUNDS = 12
  const DEFAULT_PASSWORD = 'changeme123'

  // 1. Super-admin (não pertence a nenhuma agência)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@platform.com',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, HASH_ROUNDS),
    },
  })

  // 2. Agência de teste
  const agency = await prisma.agency.create({
    data: {
      name: 'ACME Agência',
      slug: 'acme',
      primaryColor: '#6366f1',
      planStatus: 'TRIAL',
    },
  })

  // 3. Admin da agência
  const agencyAdmin = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      name: 'Admin ACME',
      role: 'AGENCY_ADMIN',
      agencyId: agency.id,
      passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, HASH_ROUNDS),
    },
  })

  // 4. Tenant (cliente final da agência)
  const tenant = await prisma.tenant.create({
    data: {
      agencyId: agency.id,
      name: 'Empresa Exemplo Ltda',
      whatsappPhone: '+5511999990001',
      digestTime: '18:00',
      timezone: 'America/Sao_Paulo',
      isActive: true,
    },
  })

  // 5. Usuário do tenant
  const tenantUser = await prisma.user.create({
    data: {
      email: 'user@empresa.com',
      name: 'João Silva',
      role: 'TENANT_USER',
      agencyId: agency.id,
      tenantId: tenant.id,
      passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, HASH_ROUNDS),
    },
  })

  console.log('Seed criado com sucesso:')
  console.table({
    'Super Admin': superAdmin.email,
    'Agency Admin': agencyAdmin.email,
    'Tenant User': tenantUser.email,
  })
  console.log(`\nSenha padrão para todos: ${DEFAULT_PASSWORD}`)
  console.log('⚠️  Altere as senhas em produção!')
}

main()
  .catch((err: unknown) => {
    console.error('Seed falhou:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
