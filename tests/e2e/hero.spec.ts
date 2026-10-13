import { expect, test } from '@playwright/test';

const PARTICIPANTS = ['USER', 'LLM', 'RAG', 'TOOLS', 'GUARDRAILS'];

test.describe('hero', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('headline is real text with a single h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/from\s+idea\s+to\s+impact/i);
    await expect(page.locator('h1 svg, h1 text')).toHaveCount(0);
  });

  test('copy and flow sit side by side without overlap or a hollow middle', async ({ page }) => {
    await page.goto('/');
    const copy = await page.locator('.hero__copy').boundingBox();
    const flow = await page.locator('[data-flow]').boundingBox();
    expect(copy!.x + copy!.width).toBeLessThanOrEqual(flow!.x);
    expect(flow!.x - (copy!.x + copy!.width)).toBeLessThan(80);
    await expect(page.locator('.hero__panel')).toHaveCount(0);
  });

  test('uses the design type scale (231px headline at 1600, 0.8x at 1280)', async ({ page }) => {
    await page.goto('/');
    const size = await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeCloseTo(184.8, 0);
  });

  test('exposes every hop of the agent loop to assistive tech as an ordered list', async ({ page }) => {
    await page.goto('/');
    const items = page.getByRole('list', { name: 'How an AI agent handles a request' }).getByRole('listitem');
    await expect(items).toHaveCount(14);
    await expect(items.first()).toHaveText('The user sends a request to the agent.');
    await expect(items.nth(2)).toHaveText('The LLM asks the agent to run the retrieval tool.');
    await expect(items.last()).toHaveText('The agent delivers the response to the user.');
  });

  test('plays the request hop by hop, the token carrying each hop label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-flow]')).toHaveAttribute('data-live', '');
    const label = page.locator('[data-flow-label]');
    await expect(label).toHaveText('request');
    await expect(label).toHaveText('prompt + tools', { timeout: 5000 });
    await expect(page.locator('[data-flow-node="user"]')).toHaveClass(/is-visited/);
    await expect(label).toHaveText('tool call: retrieve', { timeout: 5000 });
    // Participants appear only when first reached: RAG is still hidden while the LLM decides.
    const rag = await page.locator('[data-flow-node="rag"]').evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(rag)).toBe(0);
    await expect(label).toHaveText('retrieve', { timeout: 5000 });
  });

  test('routes every message through the agent; tools run only when the LLM asks', async ({ page }) => {
    await page.goto('/');
    const raw = (await page.locator('[data-flow]').getAttribute('data-hops')) ?? '[]';
    const hops = JSON.parse(raw) as { spoke: string; direction: 'out' | 'back'; to: string }[];
    expect(hops).toHaveLength(14);
    const sequence = hops.map((h) => (h.direction === 'back' ? `${h.spoke}>agent` : `agent>${h.spoke}`));
    for (const step of sequence) expect(step.includes('agent')).toBe(true);
    for (const tool of ['agent>rag', 'agent>tools']) {
      expect(sequence[sequence.indexOf(tool) - 1]).toBe('llm>agent');
    }
    expect(sequence.at(-1)).toBe('agent>user');
    await expect(page.locator('.flow-node__caption, .flow-node__tag')).toHaveCount(0);
  });

  test('step numbers sit in solid white circles overlapping their bubble by half', async ({ page }) => {
    await page.goto('/');
    const geometry = await page.locator('[data-flow-node="llm"]').evaluate((node) => {
      const chip = node.querySelector('.flow-node__chip') as SVGCircleElement;
      const disc = node.querySelector('.flow-node__disc') as SVGCircleElement;
      const c = { x: chip.cx.baseVal.value, y: chip.cy.baseVal.value };
      const d = { x: disc.cx.baseVal.value, y: disc.cy.baseVal.value, r: disc.r.baseVal.value };
      return { fill: getComputedStyle(chip).fill, distance: Math.hypot(c.x - d.x, c.y - d.y), radius: d.r };
    });
    expect(geometry.fill).toBe('rgb(255, 255, 255)');
    expect(Math.abs(geometry.distance - geometry.radius)).toBeLessThan(1.5);
  });

  test('the replay control is a keyboard-operable button that restarts the request', async ({ page }) => {
    await page.goto('/');
    const label = page.locator('[data-flow-label]');
    await expect(label).toHaveText('retrieve', { timeout: 9000 });
    const replay = page.getByRole('button', { name: 'Replay the agent flow' });
    await replay.focus();
    await page.keyboard.press('Enter');
    await expect(label).toHaveText('request');
    await expect(page.locator('[data-flow-node="rag"]')).not.toHaveClass(/is-visited/);
  });

  test('the replay hit area does not cover any participant bubble', async ({ page }) => {
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

  test('the trust line shows the Google Cloud badge in its ring, beside the CTA', async ({ page }) => {
    await page.goto('/');
    const trust = page.locator('#top .trust');
    await expect(trust).toContainText('Trusted by innovators');
    await expect(
      trust.getByRole('img', { name: 'Google Cloud Certified: Professional Cloud Developer' }),
    ).toBeVisible();
    const cta = await page.locator('#top .hero-pill--cta').boundingBox();
    const badge = await trust.boundingBox();
    expect(badge!.x).toBeGreaterThan(cta!.x + cta!.width);
    expect(Math.abs(badge!.y + badge!.height / 2 - (cta!.y + cta!.height / 2))).toBeLessThan(12);
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

  test('shows every participant and connection, static, robot fully charged', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-flow]')).not.toHaveAttribute('data-live', '');
    for (const label of PARTICIPANTS) {
      await expect(page.locator('.flow__diagram').getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator('[data-flow-label]')).toHaveText('');
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

  test('stacks copy, trust badge, then the flow', async ({ page }) => {
    await page.goto('/');
    const title = await page.locator('h1').boundingBox();
    const trust = await page.locator('#top .trust').boundingBox();
    const flow = await page.locator('[data-flow]').boundingBox();
    expect(trust!.y).toBeGreaterThan(title!.y + title!.height);
    expect(flow!.y).toBeGreaterThan(trust!.y + trust!.height);
    expect(title!.width).toBeGreaterThan(200);
  });
});
