import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { PAGES, scrollThrough, WIDTHS } from './helpers';

/** axe-core on every page at every breakpoint: zero violations allowed (WCAG 2.2 AA + best practices). */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

for (const width of WIDTHS) {
  test.describe(`axe at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of PAGES) {
      test(path, async ({ page }) => {
        await page.goto(path, { waitUntil: 'networkidle' });
        await scrollThrough(page);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
          [],
        );
      });
    }
  });
}

test.describe('forced colours', () => {
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', forcedColors: 'active' });

  test('gradient-border pills stay visibly bordered', async ({ page }) => {
    await page.goto('/');
    const border = await page
      .locator('#expertise .pill')
      .evaluate((el) => getComputedStyle(el).borderTopStyle + ' ' + getComputedStyle(el).borderTopWidth);
    expect(border).toMatch(/^solid [1-9]/);
  });
});

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('every focusable element shows a visible focus indicator', async ({ page, browserName }) => {
    // WebKit only tabs to buttons/fields by default, which would make this check meaningless there.
    test.skip(browserName === 'webkit', 'WebKit does not tab to links by default');
    await page.goto('/');
    const missing: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return {
          name: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? el.tagName,
          visible: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
        };
      });
      if (info && !info.visible) missing.push(info.name);
    }
    expect(missing).toEqual([]);
  });
});
