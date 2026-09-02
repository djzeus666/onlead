import { defineConfig } from '@playwright/test';

const E2E_PORT = process.env.E2E_PORT || '4175';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${E2E_PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node --experimental-sqlite server/index.mjs',
    env: { PORT: E2E_PORT },
    url: `http://127.0.0.1:${E2E_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
