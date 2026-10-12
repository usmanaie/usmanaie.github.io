import { defineConfig, devices } from '@playwright/test';

/**
 * Tests run against the production build served with the same headers as Firebase
 * Hosting (scripts/serve.mjs), so CSP violations fail the suite.
 *
 *   e2e-*      dist/          Chromium, Firefox, WebKit
 *   fixture-*  dist-fixture/  reviews carousel (test-only build with placeholder cards)
 *   visual     dist(-fixture) Chromium screenshot baselines (Linux baselines committed)
 *
 * Build first: pnpm build && pnpm build:fixture
 */
const PROD = 'http://localhost:4173';
const FIXTURE = 'http://localhost:4174';
const browsers = [
  { name: 'chromium', use: devices['Desktop Chrome'] },
  { name: 'firefox', use: devices['Desktop Firefox'] },
  // 1x DPR: Playwright's Windows WebKit build never reports transformed elements as "stable"
  // after scrolling at 2x, which makes clicks time out; layouts are identical at 1x.
  { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 } },
] as const;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  ...(process.env['CI'] ? { workers: 2 } : {}),
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{platform}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    ...browsers.map((b) => ({
      name: `e2e-${b.name}`,
      testMatch: 'e2e/**/*.spec.ts',
      testIgnore: '**/*.fixture.spec.ts',
      use: { ...b.use, baseURL: PROD },
    })),
    ...browsers.map((b) => ({
      name: `fixture-${b.name}`,
      testMatch: 'e2e/**/*.fixture.spec.ts',
      use: { ...b.use, baseURL: FIXTURE },
    })),
    {
      name: 'visual',
      testMatch: 'visual/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: FIXTURE, deviceScaleFactor: 1 },
    },
  ],
  webServer: [
    { command: 'node scripts/serve.mjs dist 4173', url: PROD, reuseExistingServer: !process.env['CI'] },
    { command: 'node scripts/serve.mjs dist-fixture 4174', url: FIXTURE, reuseExistingServer: !process.env['CI'] },
  ],
});
