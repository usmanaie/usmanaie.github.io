import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test.describe('without JavaScript', () => {
  test('desktop: all content is readable and navigation still works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    for (const id of ['about', 'education', 'expertise', 'projects', 'experience', 'contact']) {
      await expect(page.locator(`#${id} h2`)).toBeVisible();
    }
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Projects' }).click();
    await expect(page.locator('#projects')).toBeInViewport();
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
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
