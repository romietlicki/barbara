import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'github' : 'html',
  globalSetup: './global-setup.ts',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Em dev: inicie apps/web manualmente com `pnpm dev`
  // Em CI: defina E2E_SKIP_SERVER_START=true e suba os serviços antes
  webServer: process.env['E2E_SKIP_SERVER_START']
    ? undefined
    : {
        command: 'pnpm --filter @repo/web dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
        cwd: '../..',
      },
})
