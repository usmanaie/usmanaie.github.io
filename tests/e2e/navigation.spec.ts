import { expect, test } from '@playwright/test';

test.describe('desktop navigation', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hero nav links jump to their sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    for (const [label, id] of [
      ['Education', 'education'],
      ['Projects', 'projects'],
      ['Experience', 'experience'],
    ] as const) {
      // Let any in-flight smooth scroll finish (WebKit lets it override an instant scroll).
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              new Promise((r) => {
                const y = window.scrollY;
                setTimeout(() => r(window.scrollY === y), 150);
              }),
          ),
        )
        .toBe(true);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test('every menu link lands its section right under the sticky header', async ({ page }) => {
    await page.goto('/');
    const settled = () =>
      page.evaluate(
        () =>
          new Promise((r) => {
            let last = window.scrollY;
            const tick = () =>
              setTimeout(() => {
                if (window.scrollY === last) r(true);
                else {
                  last = window.scrollY;
                  tick();
                }
              }, 150);
            tick();
          }),
      );
    const headerHeight = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')),
    );
    for (const id of ['about', 'education', 'expertise', 'projects', 'experience']) {
      // From the hero's own menu (top of the page)...
      await settled();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.locator(`.hero__nav-link[href="#${id}"]`).click();
      await settled();
      const fromHero = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
      expect(Math.abs(fromHero - headerHeight), `${id} from the hero menu`).toBeLessThanOrEqual(2);
      // ...and from the sticky header further down, which also marks the section as current.
      await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
      await settled();
      const link = page.getByRole('navigation', { name: 'Site' }).locator(`a[href="#${id}"]`);
      await link.click();
      await settled();
      const fromHeader = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
      expect(Math.abs(fromHeader - headerHeight), `${id} from the sticky header`).toBeLessThanOrEqual(2);
      await expect(link).toHaveAttribute('aria-current', 'location');
    }
  });

  test('menu links land exactly even before the page is idle, and when arriving with a #hash', async ({ page }) => {
    const top = (id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
    const settled = async () => {
      let last = -1;
      await expect
        .poll(async () => {
          const y = await page.evaluate(() => window.scrollY);
          const still = y === last;
          last = y;
          return still;
        })
        .toBe(true);
    };
    // Click straight after the HTML is parsed, while below-the-fold sections still have estimated sizes.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.hero__nav-link[href="#experience"]').click();
    await settled();
    expect(Math.abs((await top('experience')) - 64)).toBeLessThanOrEqual(2);
    // Arriving from a sub-page link (/#projects).
    await page.goto('/privacy');
    await page.goto('/#projects');
    await settled();
    expect(Math.abs((await top('projects')) - 64)).toBeLessThanOrEqual(2);
  });

  test('the compact header appears after the hero and scroll-spy marks the current section', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('[data-site-header]');
    await expect(header).not.toHaveAttribute('data-visible', '');
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeHidden();

    await page.locator('#expertise').scrollIntoViewIfNeeded();
    await expect(header).toHaveAttribute('data-visible', '');
    const site = page.getByRole('navigation', { name: 'Site' });
    await expect(site).toBeVisible();
    await expect(site.getByRole('link', { name: 'Expertise' })).toHaveAttribute('aria-current', 'location');
  });

  test('scrolling never rewrites the URL hash, and back returns to the previous anchor', async ({ page }) => {
    await page.goto('/');
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(300);
    expect(new URL(page.url()).hash).toBe('');

    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/#about$/);
    await page.goto('/#projects');
    await page.goBack();
    await expect(page).toHaveURL(/#about$/);
  });

  test('section CTAs point at real targets', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#expertise').getByRole('link', { name: 'GET STARTED' })).toHaveAttribute(
      'href',
      '#projects',
    );
    await expect(page.locator('#experience').getByRole('link', { name: 'GET STARTED' })).toHaveAttribute(
      'href',
      '#contact',
    );
    await page.getByRole('link', { name: 'View case study: Multi-Agent AI Platform' }).click();
    await expect(page).toHaveURL(/\/projects\/multi-agent-ai-platform$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Multi-Agent AI Platform');
  });

  test('footer links reach privacy and terms pages', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('navigation', { name: 'Footer' });
    await footer.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
    await page.goBack();
    await footer.getByRole('link', { name: 'Terms & Conditions' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms & Conditions');
  });

  test('skip link moves focus to the main content', async ({ page, browserName }) => {
    await page.goto('/');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    // WebKit, like Safari by default, does not move focus to links with Tab.
    if (browserName === 'webkit') await skip.focus();
    else await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('reviews are hidden everywhere while no real quotes exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#reviews')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Reviews' })).toHaveCount(0);
  });
});
