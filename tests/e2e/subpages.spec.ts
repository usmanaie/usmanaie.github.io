import { expect, test } from '@playwright/test';

test.describe('sub-page balance (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a case study sets the story beside the project image, centred against it', async ({ page }) => {
    await page.goto('/projects/multi-agent-ai-platform');
    const story = await page.locator('.case__intro').boundingBox();
    const next = await page.locator('.case__section--next').boundingBox();
    const media = await page.locator('.case__media').boundingBox();
    expect(media!.x).toBeGreaterThan(story!.x + story!.width);
    // The image's centre sits within the story's vertical span (not hanging above or below it).
    const mediaMid = media!.y + media!.height / 2;
    expect(mediaMid).toBeGreaterThan(story!.y);
    expect(mediaMid).toBeLessThan(next!.y + next!.height);
  });

  for (const path of ['/privacy', '/terms']) {
    test(`${path} reads as one centred column`, async ({ page }) => {
      await page.goto(path);
      const column = await page.locator('.legal-page').boundingBox();
      const left = column!.x;
      const right = 1440 - (column!.x + column!.width);
      expect(Math.abs(left - right)).toBeLessThan(24);
      expect(column!.width).toBeLessThan(800);
    });
  }

  test('the 404 is centred in the window', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    const title = await page.getByRole('heading', { level: 1 }).boundingBox();
    const mid = title!.x + title!.width / 2;
    expect(Math.abs(mid - 720)).toBeLessThan(24);
  });
});

test.describe('sub-page reading order (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a case study stacks intro, image, features, then the next step', async ({ page }) => {
    await page.goto('/projects/multi-agent-ai-platform');
    const ys = await Promise.all(
      ['.case__intro', '.case__media', '.case__section--features', '.case__section--next'].map(async (s) => {
        const box = await page.locator(s).boundingBox();
        return box!.y;
      }),
    );
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
});
