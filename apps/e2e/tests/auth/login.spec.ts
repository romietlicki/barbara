import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test('credenciais válidas redirecionam para o dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@acme.com')
    await page.fill('#password', 'changeme123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@acme.com')
    await page.fill('#password', 'senha-errada')
    await page.click('button[type="submit"]')

    await expect(page.getByText('Email ou senha inválidos.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('usuário não autenticado é redirecionado para login', async ({ page }) => {
    await page.goto('/dashboard/agency')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('TENANT_USER acessa dashboard de tenant', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'user@empresa.com')
    await page.fill('#password', 'changeme123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })
})
