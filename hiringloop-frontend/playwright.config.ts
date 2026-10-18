import { randomUUID } from 'node:crypto'
import { defineConfig, devices } from '@playwright/test'

// A new run owns its identities/organizations and its loopback servers.
process.env.E2E_RUN_ID ??= randomUUID()
process.env.E2E_CONTROL_TOKEN ??= randomUUID()
const backendEnv = {
  HIRINGLOOP_E2E: '1',
  E2E_RUN_ID: process.env.E2E_RUN_ID,
  E2E_CONTROL_TOKEN: process.env.E2E_CONTROL_TOKEN,
}

export default defineConfig({
  testDir: './e2e',
  outputDir: `test-results/${process.env.E2E_RUN_ID}`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'json',
      { outputFile: `test-results/${process.env.E2E_RUN_ID}/results.json` },
    ],
  ],
  globalTeardown: './e2e/teardown.ts',
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'Asia/Kolkata',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'E2E backend',
      command: 'node scripts/e2e-server.js',
      cwd: '../hiringloop-backend',
      env: backendEnv,
      url: 'http://127.0.0.1:4700/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      name: 'E2E frontend',
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      env: { VITE_API_BASE_URL: 'http://127.0.0.1:4700' },
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
