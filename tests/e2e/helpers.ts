import { expect, type Page } from '@playwright/test';

export const PAGES = [
  '/',
  '/projects',
  '/projects/dairector',
  '/projects/multi-agent-ai-platform',
  '/projects/enterprise-telehealth-platform',
  '/projects/responsible-ai-governance',
  '/privacy',
  '/terms',
] as const;

export const WIDTHS = [320, 360, 390, 768, 1024, 1280, 1440, 1920, 2560] as const;

/** Collects console errors, CSP violations and failed requests for the lifetime of the page. */
export function watchForProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ''}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().endsWith('/does-not-exist'))
      problems.push(`http ${res.status()}: ${res.url()}`);
  });
  return problems;
}

/** Scrolls through the page so lazy images and observers settle. */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
}

export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, 'horizontal overflow').toBeLessThanOrEqual(clientWidth);
}
