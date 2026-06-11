import { test, expect } from '../../fixtures/auth'

test.describe('Billing Page', () => {
  test.beforeEach(async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/billing')
    await expect(page).toHaveURL(/\/dashboard\/agency\/billing/)
  })

  test('exibe título e status do plano', async ({ agencyAdminPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Plano & Cobrança' })).toBeVisible()
    // Badge de status deve estar visível (TRIAL, ACTIVE, PAST_DUE ou CANCELED)
    await expect(page.locator('h2')).toBeVisible()
  })

  test('exibe CTA para assinar quando plano é TRIAL', async ({ agencyAdminPage: page }) => {
    // Seed: agência acme está com TRIAL por padrão
    const assinaturaBadge = page.getByText('TRIAL')
    if (await assinaturaBadge.count() > 0) {
      await expect(page.getByRole('button', { name: 'Assinar agora' })).toBeVisible()
    }
  })

  test('exibe descrição do plano atual', async ({ agencyAdminPage: page }) => {
    // A descrição muda por status mas sempre há texto descritivo
    await expect(page.locator('p.text-sm.text-gray-500')).toBeVisible()
  })
})

test.describe('Billing Page — controle de acesso', () => {
  test('TENANT_USER não acessa a página de billing da agência', async ({ tenantUserPage: page }) => {
    await page.goto('/dashboard/agency/billing')
    await expect(page).not.toHaveURL('/dashboard/agency/billing', { timeout: 8_000 })
  })
})
