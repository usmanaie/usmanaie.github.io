import { expect, test } from '@playwright/test';

const STEPS = ['USER', 'AGENT', 'LLM', 'RAG', 'TOOLS', 'GUARDRAILS', 'RESPONSE'];

test.describe('hero', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('headline is real text with a single h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/from\s+idea\s+to\s+impact/i);
    await expect(page.locator('h1 svg, h1 text')).toHaveCount(0);
  });

  test('fits one viewport and the flow never overlaps the copy', async ({ page }) => {
    await page.goto('/');
    const hero = await page.locator('#top').boundingBox();
    const copy = await page.locator('.hero__copy').boundingBox();
    const flow = await page.locator('[data-flow]').boundingBox();
    expect(hero!.height).toBeLessThanOrEqual(720);
    expect(copy!.x + copy!.width).toBeLessThanOrEqual(flow!.x);
    await expect(page.locator('.hero__panel')).toHaveCount(0);
  });

  test('exposes the agent loop to assistive tech as an ordered list of seven steps', async ({ page }) => {
    await page.goto('/');
    const list = page.getByRole('list', { name: 'How an AI agent handles a request' });
    await expect(list.getByRole('listitem')).toHaveCount(7);
    await expect(list.getByRole('listitem').first()).toHaveText(/^User: request, intent$/);
    await expect(list.getByRole('listitem').nth(5)).toHaveText(/^Guardrails: verify, comply$/);
  });

  test('plays the steps in order, with the agent token travelling between them', async ({ page }) => {
    await page.goto('/');
    const flow = page.locator('[data-flow]');
    await expect(flow).toHaveAttribute('data-live', '');
    const visited = () => page.locator('[data-flow-node].is-visited').count();
    await expect.poll(visited).toBe(1);
    await expect(page.locator('[data-flow-node="1"]')).toHaveClass(/is-active/);
    const distance = () => page.locator('[data-flow-token]').evaluate((el) => getComputedStyle(el).offsetDistance);
    const start = await distance();
    await expect.poll(visited, { timeout: 8000 }).toBeGreaterThanOrEqual(3);
    expect(await distance()).not.toBe(start);
    // Only steps already reached are shown; later steps stay hidden until the token arrives.
    const hiddenLater = await page
      .locator('[data-flow-node]:not(.is-visited)')
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(hiddenLater)).toBe(0);
  });

  test('step numbers sit in solid white circles overlapping their bubble by half', async ({ page }) => {
    await page.goto('/');
    const geometry = await page.locator('[data-flow-node="3"]').evaluate((node) => {
      const chip = node.querySelector('.flow-node__chip') as SVGCircleElement;
      const disc = node.querySelector('.flow-node__disc') as SVGCircleElement;
      const c = { x: chip.cx.baseVal.value, y: chip.cy.baseVal.value };
      const d = { x: disc.cx.baseVal.value, y: disc.cy.baseVal.value, r: disc.r.baseVal.value };
      return { fill: getComputedStyle(chip).fill, distance: Math.hypot(c.x - d.x, c.y - d.y), radius: d.r };
    });
    expect(geometry.fill).toBe('rgb(255, 255, 255)');
    // The chip centre lies on the bubble's edge, so half the chip overlaps the bubble.
    expect(Math.abs(geometry.distance - geometry.radius)).toBeLessThan(1.5);
  });

  test('the replay control is a keyboard-operable button that restarts from step 1', async ({ page }) => {
    await page.goto('/');
    await expect
      .poll(() => page.locator('[data-flow-node].is-visited').count(), { timeout: 8000 })
      .toBeGreaterThanOrEqual(3);
    const replay = page.getByRole('button', { name: 'Replay the agent flow' });
    await replay.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.locator('[data-flow-node].is-visited').count()).toBeLessThanOrEqual(1);
  });

  test('the replay hit area does not cover any step bubble', async ({ page }) => {
    await page.goto('/');
    const button = await page.locator('[data-hero-replay]').boundingBox();
    for (const bubble of await page.locator('.flow-node__disc').all()) {
      const box = await bubble.boundingBox();
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

  test('the Google Cloud certification badge replaces the unverified trust claim', async ({ page }) => {
    await page.goto('/');
    const cert = page.locator('#top .cert');
    await expect(cert).toContainText('Google Cloud Certified');
    await expect(cert).toContainText('Professional Cloud Developer');
    await expect(cert.locator('img')).toHaveAttribute('alt', '');
    await expect(page.getByText('Trusted by innovators')).toHaveCount(0);
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
  test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

  test('shows the complete flow, static: every step, every connector, robot fully charged', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const flow = page.locator('[data-flow]');
    await expect(flow).not.toHaveAttribute('data-live', '');
    for (const label of STEPS)
      await expect(page.locator('.flow__diagram').getByText(label, { exact: true })).toBeVisible();
    const state = await page.evaluate(() => ({
      dash: getComputedStyle(document.querySelector('.flow__seg-core')!).strokeDashoffset,
      level: getComputedStyle(document.querySelector('[data-flow]')!).getPropertyValue('--level').trim(),
      bob: getComputedStyle(document.querySelector('.flow__robot')!).animationName,
    }));
    expect(parseFloat(state.dash)).toBe(0);
    expect(Number(state.level)).toBe(1);
    expect(state.bob).toBe('none');
  });

  test('anchor navigation jumps instantly', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });
});

test.describe('mobile hero', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('stacks copy, badge, then the flow, instead of shrinking a desktop canvas', async ({ page }) => {
    await page.goto('/');
    const title = await page.locator('h1').boundingBox();
    const cert = await page.locator('#top .cert').boundingBox();
    const flow = await page.locator('[data-flow]').boundingBox();
    expect(cert!.y).toBeGreaterThan(title!.y + title!.height);
    expect(flow!.y).toBeGreaterThan(cert!.y + cert!.height);
    expect(title!.width).toBeGreaterThan(200);
  });
});
