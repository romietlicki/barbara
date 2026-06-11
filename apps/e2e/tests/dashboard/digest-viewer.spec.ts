import { test, expect } from '../../fixtures/auth'

test.describe('Digest Viewer — AGENCY_ADMIN', () => {
  test('página de clientes carrega sem erro', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    await expect(page.getByRole('table')).toBeVisible()
    // Sem mensagens de erro visíveis
    await expect(page.getByText(/erro interno|something went wrong/i)).not.toBeVisible()
  })

  test('navega para a página de um cliente', async ({ agencyAdminPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    const firstRow = page.locator('tbody tr').first()
    // Clica no primeiro link de detalhes disponível
    const detailLink = firstRow.locator('a').first()
    if (await detailLink.count() > 0) {
      await detailLink.click()
      await expect(page).toHaveURL(/\/clientes\/[^/]+/)
    }
  })
})

test.describe('Digest Viewer — TENANT_USER', () => {
  test('tenant user acessa lista de digests', async ({ tenantUserPage: page }) => {
    await page.goto('/dashboard/tenant/digests')
    await expect(page).toHaveURL(/\/dashboard\/tenant\/digests/)
    // Tabela ou estado vazio — ambos são válidos sem dados gerados
    await expect(
      page.locator('table, [data-empty], h1, h2').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('tenant user não acessa área da agência', async ({ tenantUserPage: page }) => {
    await page.goto('/dashboard/agency/clientes')
    // Deve ser redirecionado ou receber página de acesso negado
    await expect(page).not.toHaveURL('/dashboard/agency/clientes', { timeout: 8_000 })
  })
})
