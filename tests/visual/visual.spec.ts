import { expect, test } from '@playwright/test';

/**
 * Visual regression with approved baselines (committed for Linux, generated in CI).
 * 1440px: every section. 390/768/1024: full-page snapshots of the responsive designs.
 * Fidelity against the original design export is measured separately by
 * scripts/fidelity.mjs (see DECISIONS.md for the results and accepted exceptions).
 */
const SECTIONS = ['top', 'about', 'expertise', 'projects', 'experience', 'reviews', 'contact'];

async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');
}

test.describe('1440px sections', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  for (const id of SECTIONS) {
    test(id, async ({ page }) => {
      await page.goto('/');
      await settle(page);
      await expect(page.locator(`#${id}`)).toHaveScreenshot(`1440-${id}.png`);
    });
  }
});

for (const width of [390, 768, 1024]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });

    test('full page', async ({ page }) => {
      await page.goto('/');
      await settle(page);
      await expect(page).toHaveScreenshot(`${width}-full.png`, { fullPage: true });
    });
  });
}
