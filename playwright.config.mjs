import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'android-like-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'ios-like-webkit',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
