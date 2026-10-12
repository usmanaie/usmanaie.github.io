import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('mobile menu', () => {
  test('opens, traps focus, closes with Escape and restores focus', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    const close = page.getByRole('button', { name: 'Close menu' });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('navigation', { name: 'Mobile' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link').first()).toBeFocused();
    expect(await page.evaluate(() => document.body.classList.contains('is-scroll-locked'))).toBe(true);
    expect(await page.evaluate(() => (document.querySelector('main') as HTMLElement).inert)).toBe(true);

    // Shift+Tab from the first link goes to the toggle, Shift+Tab again wraps to the last item.
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(menu.getByRole('link').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
    expect(await page.evaluate(() => document.body.classList.contains('is-scroll-locked'))).toBe(false);
  });

  test('closes after choosing a section and navigates to it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Experience' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeHidden();
    await expect(page).toHaveURL(/#experience$/);
    await expect(page.locator('#experience')).toBeInViewport();
  });

  test('opening the menu causes no layout shift', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('.site-header__brand').boundingBox();
    await page.getByRole('button', { name: 'Open menu' }).click();
    const after = await page.locator('.site-header__brand').boundingBox();
    expect(after?.x).toBe(before?.x);
  });
});
