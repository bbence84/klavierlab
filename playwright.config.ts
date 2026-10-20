import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host=127.0.0.1 --port=3100 --strictPort',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
  },
});