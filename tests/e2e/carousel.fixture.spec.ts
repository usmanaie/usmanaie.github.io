import { expect, test } from '@playwright/test';

/** Runs against the test-only fixture build (placeholder reviews), never production. */
test.use({ viewport: { width: 1440, height: 900 } });

test.describe('reviews carousel', () => {
  test('exposes carousel semantics', async ({ page }) => {
    await page.goto('/#reviews');
    const region = page.getByRole('region', { name: 'Colleague reviews' });
    await expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const slides = region.getByRole('group');
    await expect(slides).toHaveCount(5);
    await expect(slides.first()).toHaveAttribute('aria-roledescription', 'slide');
    await expect(slides.first()).toHaveAttribute('aria-label', '1 of 5');
  });

  test('prev/next step through slides and disable at the ends', async ({ page }) => {
    await page.goto('/#reviews');
    const prev = page.getByRole('button', { name: 'Previous review' });
    const next = page.getByRole('button', { name: 'Next review' });
    const status = page.locator('#reviews [data-carousel-status]');
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
    await expect(status).toHaveText('Showing review 1 of 5');

    await next.click();
    await expect(status).toHaveText('Showing review 2 of 5');
    await expect(prev).toHaveAttribute('aria-disabled', 'false');

    // Like the design (max index 2), the track reaches its end after two steps.
    await next.click();
    await expect(status).toHaveText('Showing review 3 of 5');
    await expect(next).toHaveAttribute('aria-disabled', 'true');

    await prev.click();
    await expect(status).toHaveText('Showing review 2 of 5');
  });

  test('the track scrolls with the keyboard', async ({ page }) => {
    await page.goto('/#reviews');
    const track = page.locator('#reviews [data-carousel-track]');
    await track.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('the nav includes Reviews when the section is enabled', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Reviews' }),
    ).toBeVisible();
  });

  test('avatar artwork is defined once, so ids stay unique', async ({ page }) => {
    await page.goto('/');
    const duplicates = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(duplicates).toEqual([]);
  });
});
