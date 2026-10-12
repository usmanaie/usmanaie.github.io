import { expect, test } from '@playwright/test';

import { expectNoHorizontalOverflow, PAGES, scrollThrough, watchForProblems, WIDTHS } from './helpers';

test.describe('page health', () => {
  for (const path of PAGES) {
    test(`${path} loads with no console errors, failed requests or CSP violations`, async ({ page }) => {
      const problems = watchForProblems(page);
      const response = await page.goto(path, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      await scrollThrough(page);
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/Usman Aslam/);
    });
  }

  test('unknown routes return the custom 404 page', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page took a wrong turn');
  });

  test('responses carry the security headers', async ({ request }) => {
    const res = await request.get('/');
    const headers = res.headers();
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  test('the only third-party traffic is none at all', async ({ page, baseURL }) => {
    const origins = new Set<string>();
    page.on('request', (req) => origins.add(new URL(req.url()).origin));
    await page.goto('/', { waitUntil: 'networkidle' });
    await scrollThrough(page);
    expect([...origins]).toEqual([new URL(baseURL!).origin]);
  });
});

test.describe('layout', () => {
  for (const width of WIDTHS) {
    test(`no horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/projects', '/privacy']) {
        await page.goto(path, { waitUntil: 'networkidle' });
        await expectNoHorizontalOverflow(page);
      }
    });
  }

  test('touch targets are at least 44px tall', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main a, main button, footer a, header button')]
        .filter((el) => el.offsetParent !== null && !el.closest('.visually-hidden'))
        .map((el) => ({
          text: el.textContent?.trim() || el.getAttribute('aria-label'),
          h: el.getBoundingClientRect().height,
        }))
        .filter((t) => t.h > 0 && t.h < 44),
    );
    expect(small).toEqual([]);
  });

  test('the contact email never appears in plain text', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).not.toContain('usmanaslam1002@gmail.com');
    const href = await page.getByRole('link', { name: 'Contact Usman by email' }).getAttribute('href');
    expect(decodeURIComponent(href ?? '')).toBe('mailto:usmanaslam1002@gmail.com');
  });
});
