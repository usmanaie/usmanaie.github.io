import { expect, test } from '@playwright/test';

test.describe('hero animation', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('headline is real text with a single h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/from\s+idea\s+to\s+impact/i);
    await expect(page.locator('h1 svg, h1 text')).toHaveCount(0);
  });

  test('the replay control is a keyboard-operable button that restarts the cycle', async ({ page }) => {
    await page.goto('/');
    const replay = page.getByRole('button', { name: 'Replay the agent animation' });
    await replay.focus();
    await expect(replay).toBeFocused();
    await page.evaluate(() => {
      const hero = document.querySelector('[data-hero]')!;
      new MutationObserver(() => {
        if (hero.hasAttribute('data-resetting')) document.documentElement.dataset['restarted'] = 'yes';
      }).observe(hero, { attributes: true });
    });
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-restarted', 'yes');
    await expect(page.locator('[data-hero]')).not.toHaveAttribute('data-resetting', '');
  });

  test('the replay hit area does not cover the orbs', async ({ page }) => {
    await page.goto('/');
    const button = await page.locator('[data-hero-replay]').boundingBox();
    for (const orb of await page.locator('.orb__bubble').all()) {
      const box = await orb.boundingBox();
      const overlaps =
        box &&
        button &&
        box.x < button.x + button.width &&
        box.x + box.width > button.x &&
        box.y < button.y + button.height &&
        box.y + box.height > button.y;
      expect(overlaps).toBeFalsy();
    }
  });

  test('animations pause once the hero is scrolled out of view', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('[data-hero]');
    await expect(hero).not.toHaveAttribute('data-paused', '');
    await page.locator('#education').scrollIntoViewIfNeeded();
    await expect(hero).toHaveAttribute('data-paused', '');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(hero).not.toHaveAttribute('data-paused', '');
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('shows the static, complete end-state frame', async ({ page }) => {
    await page.goto('/');
    const state = await page.evaluate(() => {
      const fill = document.querySelector('.agent__level')!;
      const trail = document.querySelector('.agent__trail--core')!;
      const pulse = document.querySelector('.agent__pulse')!;
      return {
        animation: getComputedStyle(document.querySelector('.agent__fill')!).animationName,
        level: getComputedStyle(fill).height,
        dash: getComputedStyle(trail).strokeDasharray,
        pulse: Number(getComputedStyle(pulse).opacity),
        spin: getComputedStyle(document.querySelector('.hero__trust-ring')!).animationName,
      };
    });
    expect(state.animation).toBe('none');
    expect(state.spin).toBe('none');
    expect(parseFloat(state.level)).toBeCloseTo(797, 0);
    expect(state.dash).toBe('none');
    expect(state.pulse).toBeGreaterThan(0);
  });

  test('anchor navigation jumps instantly', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });
});

test.describe('mobile hero', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('re-flows into a stacked layout instead of a shrunken canvas', async ({ page }) => {
    await page.goto('/');
    const title = await page.locator('h1').boundingBox();
    const agent = await page.locator('.agent-frame').boundingBox();
    expect(title && agent && agent.y > title.y + title.height).toBeTruthy();
    expect(title!.width).toBeGreaterThan(200);
  });
});
