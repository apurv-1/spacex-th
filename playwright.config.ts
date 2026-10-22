import { defineConfig, devices } from '@playwright/test'

const reuseExistingServer = !process.env.CI

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun server/index.mjs',
      url: 'http://127.0.0.1:4000/v4/rockets',
      reuseExistingServer,
      timeout: 30_000,
    },
    {
      command: 'bun run vite --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
})
