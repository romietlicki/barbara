import { test, expect } from '../../fixtures/auth'
import { prisma } from '@repo/db'

const E2E_TENANT_NAME = 'Cliente Onboarding E2E'

test.describe('Onboarding', () => {
  test.afterEach(async () => {
    await prisma.tenant.deleteMany({ where: { name: E2E_TENANT_NAME } })
    await prisma.$disconnect()
  })

  test('step 1 exibe boas-vindas e botão para avançar', async ({ agencyAdminPage: page }) => {
    await page.goto('/onboarding')
    await expect(page.getByText('Bem-vindo!')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Começar configuração' })).toBeVisible()
  })

  test('step 1 → step 2: formulário de criação de cliente', async ({ agencyAdminPage: page }) => {
    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'Começar configuração' }).click()
    await expect(page.getByText('Cadastrar primeiro cliente')).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#whatsappPhone')).toBeVisible()
  })

  test('cria cliente no step 2 e avança para step 3', async ({ agencyAdminPage: page }) => {
    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'Começar configuração' }).click()

    await page.fill('#name', E2E_TENANT_NAME)
    await page.fill('#whatsappPhone', '5511999880001')
    await page.getByRole('button', { name: 'Criar cliente' }).click()

    await expect(page.getByText('Conectar WhatsApp')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Pular por agora' })).toBeVisible()
  })

  test('pular no step 3 redireciona para o dashboard', async ({ agencyAdminPage: page }) => {
    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'Começar configuração' }).click()

    await page.fill('#name', E2E_TENANT_NAME)
    await page.fill('#whatsappPhone', '5511999880002')
    await page.getByRole('button', { name: 'Criar cliente' }).click()

    await expect(page.getByRole('button', { name: 'Pular por agora' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Pular por agora' }).click()
    await expect(page).toHaveURL(/\/dashboard\/agency/, { timeout: 10_000 })
  })
})
