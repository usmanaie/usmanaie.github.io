import { expect, test } from '@playwright/test';

test.describe('certifications', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('follows Experience: the certification first, then skill badges, then completion badges', async ({ page }) => {
    await page.goto('/');
    const order = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.id));
    expect(order.indexOf('certifications')).toBe(order.indexOf('experience') + 1);

    const section = page.locator('#certifications');
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('My Google Cloud Profile');
    await expect(section.locator('.cert-card')).toContainText('Professional Cloud Developer');

    const y = async (selector: string) => (await section.locator(selector).first().boundingBox())!.y;
    expect(await y('.cert-card')).toBeLessThan(await y('.skill-grid'));
    expect(await y('.skill-grid')).toBeLessThan(await y('.rail'));
  });

  test('every badge is a verifiable link to its public Google Skills page, with descriptive alt text', async ({
    page,
  }) => {
    await page.goto('/');
    const section = page.locator('#certifications');
    const skill = section.locator('.skill-grid .badge-link');
    const completion = section.locator('.rail .badge-link');
    await expect(skill).toHaveCount(7);
    await expect(completion).toHaveCount(25);
    for (const link of [...(await skill.all()), ...(await completion.all())]) {
      await expect(link).toHaveAttribute(
        'href',
        /^https:\/\/www\.skills\.google\/public_profiles\/[\w-]+\/badges\/\d+$/,
      );
      await expect(link.locator('img')).toHaveAttribute('alt', /(skill|completion) badge, earned \w{3} \d{4}$/);
    }
  });

  test('the featured card stays compact beside the heading column', async ({ page }) => {
    await page.goto('/');
    const card = await page.locator('#certifications .cert-card').boundingBox();
    const intro = await page.locator('#certifications .creds__intro').boundingBox();
    expect(card!.width).toBeLessThanOrEqual(400);
    expect(card!.x).toBeGreaterThan(intro!.x + intro!.width);
  });

  test('completion badges page through a carousel: no scrollbar, arrows, progress and announcements', async ({
    page,
  }) => {
    await page.goto('/');
    const group = page.locator('#certifications [data-carousel]');
    await group.scrollIntoViewIfNeeded();
    await expect(group).toHaveAttribute('data-enhanced', '');
    const track = group.locator('[data-carousel-track]');
    // The native scrollbar is hidden once enhanced (no space reserved for it).
    expect(await track.evaluate((el) => (el as HTMLElement).offsetHeight - el.clientHeight)).toBe(0);

    const prev = group.locator('[data-carousel-prev]');
    const next = group.locator('[data-carousel-next]');
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
    await expect(next).toHaveAttribute('aria-disabled', 'false');
    await next.click();
    await expect(prev).toHaveAttribute('aria-disabled', 'false');
    await expect(group.locator('[data-carousel-status]')).not.toHaveText('Showing badge 1 of 25');
    await expect(group.locator('[data-carousel-status]')).toHaveText(/^Showing badge \d+ of 25$/);
    expect(Number(await group.evaluate((g) => g.style.getPropertyValue('--carousel-progress')))).toBeGreaterThan(0);
  });
});
