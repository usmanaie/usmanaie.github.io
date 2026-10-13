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

  test('scales the whole design to fit the window (720px tall: height-limited)', async ({ page }) => {
    await page.goto('/');
    // u = min(1280 / 1600, 720 / 1067): the 231-unit headline scales with the window height.
    const size = await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeCloseTo((231 * 720) / 1067, 0);
  });

  for (const [width, height] of [
    [1024, 640],
    [1280, 585],
    [1366, 768],
    [1920, 1080],
  ] as const) {
    test(`the complete hero fits a ${width}x${height} window`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      for (const selector of ['.hero-pill--cta', '#top .trust', '#top .cert', '[data-flow]', '.hero-pill--nav']) {
        const box = await page.locator(selector).boundingBox();
        expect(box!.y + box!.height, selector).toBeLessThanOrEqual(height);
        expect(box!.x + box!.width, selector).toBeLessThanOrEqual(width);
      }
    });
  }

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

  test('the robot turns its head toward each participant, the sprite loading after first paint', async ({
    page,
    request,
  }) => {
    // First paint: the head faces the USER in the photo; the head sprite is not requested by HTML.
    const html = await (await request.get('/')).text();
    expect(html).not.toMatch(/(src|srcset|href)="[^"]*robot-head-sprite/);

    await page.goto('/');
    const flow = page.locator('[data-flow]');
    const frames = Number(await flow.getAttribute('data-head-frames'));
    expect(frames).toBeGreaterThan(20);
    await expect(flow).toHaveAttribute('data-head-live', '');
    // The photo's own head is masked out; the canvas draws the turning head.
    const mask = await page.locator('.flow__robot-img').evaluate((el) => getComputedStyle(el).maskImage);
    expect(mask).toContain('linear-gradient');
    // The body's charge fill stops at the collar; the canvas fills the head itself.
    const chargeMask = await page.locator('.flow__charge').evaluate((el) => getComputedStyle(el).maskImage);
    expect(chargeMask).toContain('robot-agent-mask-body');
    const drawn = await page.locator('[data-flow-head]').evaluate((c) => {
      const canvas = c as HTMLCanvasElement;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i]! > 200) opaque += 1;
      return opaque;
    });
    expect(drawn).toBeGreaterThan(1000);

    await expect(page.locator('[data-flow-label]')).toHaveText('prompt + tools', { timeout: 5000 });
    await expect(flow).toHaveAttribute('data-head', String(frames - 1));
    await expect(page.locator('[data-flow-label]')).toHaveText('policy check', { timeout: 30000 });
    const towardGuardrails = Number(await flow.getAttribute('data-head'));
    expect(towardGuardrails).toBeGreaterThan(0);
    expect(towardGuardrails).toBeLessThan(frames / 2);

    // The sprite is fetched only after the page has loaded (it never competes with the LCP).
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const sprite = performance.getEntriesByType('resource').find((r) => r.name.includes('robot-head-sprite'));
      return { loadEnd: nav.loadEventEnd, start: sprite?.startTime ?? -1 };
    });
    expect(timing.start).toBeGreaterThanOrEqual(timing.loadEnd);
  });

  test('the charge turns green once the guardrails approve', async ({ page }) => {
    await page.goto('/');
    const flow = page.locator('[data-flow]');
    await expect(flow).not.toHaveAttribute('data-approved', '');
    await expect(page.locator('[data-flow-label]')).toHaveText('approved', { timeout: 30000 });
    await expect(flow).toHaveAttribute('data-approved', '');
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

  test('the CTA, trust badge and certification share one row right under the text, above the robot', async ({
    page,
  }) => {
    await page.goto('/');
    const trust = page.locator('#top .trust');
    await expect(trust).toContainText('Trusted by innovators');
    await expect(trust.locator('.trust__plus')).toBeVisible();
    const cert = page.locator('#top .cert');
    await expect(cert).toContainText('Google Cloud Certified');
    await expect(cert).toContainText('Professional Cloud Developer');
    await expect(cert.locator('svg.cert__seal')).toBeVisible();
    // Same ring badge as the trust claim: dotted gradient ring, mark inside, two lines beside.
    for (const badge of [trust, cert]) {
      await expect(badge.locator('.ring-badge__ring')).toBeVisible();
      await expect(badge.locator('.ring-badge__text br')).toHaveCount(1);
    }
    const [trustRing, certRing] = await Promise.all([
      trust.locator('.ring-badge__mark').boundingBox(),
      cert.locator('.ring-badge__mark').boundingBox(),
    ]);
    expect(certRing!.width).toBeCloseTo(trustRing!.width, 0);
    // The left column reads as one block: no gap between the text and the CTA (as in the design).
    const text = await page.locator('#top .hero__text').boundingBox();
    const cta = await page.locator('#top .hero-pill--cta').boundingBox();
    const ctaGap = cta!.y - (text!.y + text!.height);
    expect(ctaGap).toBeGreaterThan(0);
    expect(ctaGap).toBeLessThan(40);
    // As in the design, the badges sit in front of the CTA's row (layered above the agent flow).
    const badge = await trust.boundingBox();
    expect(badge!.x).toBeGreaterThan(cta!.x + cta!.width);
    expect(Math.abs(badge!.y + badge!.height / 2 - (cta!.y + cta!.height / 2))).toBeLessThan(6);
    const layer = await page.locator('#top .hero__actions').evaluate((el) => Number(getComputedStyle(el).zIndex));
    expect(layer).toBeGreaterThan(0);
    // The certification sits to the right of the trust badge, on the same line.
    const certBox = await cert.boundingBox();
    expect(certBox!.x).toBeGreaterThan(badge!.x + badge!.width);
    expect(Math.abs(certBox!.y + certBox!.height / 2 - (badge!.y + badge!.height / 2))).toBeLessThan(4);
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
    await expect(page.locator('[data-flow]')).toHaveAttribute('data-approved', '');
    const state = await page.evaluate(() => ({
      dash: getComputedStyle(document.querySelector('.flow__seg-core')!).strokeDashoffset,
      level: getComputedStyle(document.querySelector('[data-flow]')!).getPropertyValue('--level').trim(),
      bob: getComputedStyle(document.querySelector('.flow__robot')!).animationName,
    }));
    expect(parseFloat(state.dash)).toBe(0);
    expect(Number(state.level)).toBe(1);
    expect(state.bob).toBe('none');
    // Static head (facing the USER, from the photo); the head sprite is never fetched.
    await expect(page.locator('[data-flow]')).not.toHaveAttribute('data-head-live', '');
    const sprite = await page.evaluate(() =>
      performance.getEntriesByType('resource').some((r) => r.name.includes('robot-head-sprite')),
    );
    expect(sprite).toBe(false);
  });

  test('anchor navigation jumps instantly', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });
});

test.describe('mobile hero', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('stacks copy, trust badge, certification, then the flow', async ({ page }) => {
    await page.goto('/');
    const title = await page.locator('h1').boundingBox();
    const trust = await page.locator('#top .trust').boundingBox();
    const flow = await page.locator('[data-flow]').boundingBox();
    expect(trust!.y).toBeGreaterThan(title!.y + title!.height);
    const cert = await page.locator('#top .cert').boundingBox();
    expect(cert!.y).toBeGreaterThan(trust!.y + trust!.height);
    expect(flow!.y).toBeGreaterThan(cert!.y + cert!.height);
    expect(title!.width).toBeGreaterThan(200);
  });
});
