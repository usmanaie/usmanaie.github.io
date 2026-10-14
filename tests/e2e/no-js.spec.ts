import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test.describe('without JavaScript', () => {
  test('desktop: all content is readable and navigation still works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    for (const id of ['about', 'education', 'expertise', 'projects', 'experience', 'contact']) {
      await expect(page.locator(`#${id} h2`)).toBeVisible();
    }
    // The always-visible header takes over from the hero's nav row (no duplicate, no overlap).
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
    const site = page.getByRole('navigation', { name: 'Site' });
    await expect(site).toBeVisible();
    await site.getByRole('link', { name: 'Projects' }).click();
    await expect(page.locator('#projects')).toBeInViewport();
  });

  test('the Expertise ring art still loads (deferred with JS, plain lazy images without)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('#expertise').scrollIntoViewIfNeeded();
    const layers = page.locator('#expertise .expertise__layer');
    await expect(layers).toHaveCount(2);
    await expect
      .poll(() => layers.evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
  });

  test('mobile: the useless menu button is hidden and the footer nav remains', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
    await expect(
      page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Projects' }),
    ).toBeVisible();
  });
});
