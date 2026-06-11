import { test as base, type Page } from '@playwright/test'

export { expect } from '@playwright/test'

type AuthFixtures = {
  agencyAdminPage: Page
  tenantUserPage: Page
}

export const test = base.extend<AuthFixtures>({
  agencyAdminPage: async ({ page }, use) => {
    await loginAs(page, 'admin@acme.com', 'changeme123')
    await use(page)
  },
  tenantUserPage: async ({ page }, use) => {
    await loginAs(page, 'user@empresa.com', 'changeme123')
    await use(page)
  },
})

async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}
