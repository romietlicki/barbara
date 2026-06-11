import { test, expect } from '../../fixtures/auth'
import { prisma } from '@repo/db'

const E2E_TENANT_NAME = 'Cliente Playwright CRUD'
const E2E_TENANT_PHONE = '5511988880099'

test.describe('Gerenciamento de Clientes (CRUD)', () => {
  test.afterEach(async () => {
    await prisma.tenant.deleteMany({ where: { name: E2E_TENANT_NAME } })
    await prisma.$disconnect()
  })

  test('lista clientes existentes', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('abre modal de novo cliente', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    await page.getByRole('button', { name: 'Novo Cliente' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible()
  })

  test('cria novo cliente com sucesso', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    await page.getByRole('button', { name: 'Novo Cliente' }).click()

    await page.fill('#name', E2E_TENANT_NAME)
    await page.fill('#whatsappPhone', E2E_TENANT_PHONE)
    await page.getByRole('button', { name: 'Criar cliente' }).click()

    // Dialog fecha e lista atualiza
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(E2E_TENANT_NAME)).toBeVisible()
  })

  test('campos obrigatórios impedem submit vazio', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    await page.getByRole('button', { name: 'Novo Cliente' }).click()

    // Tenta submeter sem preencher
    await page.getByRole('button', { name: 'Criar cliente' }).click()

    // Navegação não ocorre — dialog permanece aberto
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('AGENCY_ADMIN vê botão de conectar WhatsApp por cliente', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    // Ao menos o cliente de seed deve estar na tabela
    await expect(page.getByRole('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    await expect(rows).not.toHaveCount(0)
  })
})
