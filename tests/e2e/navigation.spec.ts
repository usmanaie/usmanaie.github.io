import { expect, test } from '@playwright/test';

/*
 * How long a menu link's smooth scroll may take to land. The lower sections sit over 4,000px down,
 * which takes about 1.3s on an idle machine and several times that with the suite's workers busy.
 */
const LANDING_TIMEOUT = 10_000;

test.describe('desktop navigation', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hero nav links jump to their sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    for (const [label, id] of [
      ['Expertise', 'expertise'],
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
    const headerHeight = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')),
    );
    // The smooth scroll starts a beat after the click, so wait for the section to arrive (and stay).
    const landsUnderHeader = (id: string, from: string) =>
      expect
        .poll(() => page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top)), {
          message: `${id} from the ${from}`,
          timeout: LANDING_TIMEOUT,
        })
        .toBeGreaterThanOrEqual(headerHeight - 2)
        .then(() =>
          expect
            .poll(() => page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top)), {
              message: `${id} from the ${from}`,
              timeout: LANDING_TIMEOUT,
            })
            .toBeLessThanOrEqual(headerHeight + 2),
        );
    for (const id of ['about', 'expertise', 'projects', 'experience', 'certifications']) {
      // From the hero's own menu (top of the page)...
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.locator(`.hero__nav-link[href="#${id}"]`).click();
      await landsUnderHeader(id, 'hero menu');
      // ...and from the sticky header further down, which also marks the section as current.
      await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
      const link = page.getByRole('navigation', { name: 'Site' }).locator(`a[href="#${id}"]`);
      await link.click();
      await landsUnderHeader(id, 'sticky header');
      await expect(link).toHaveAttribute('aria-current', 'location');
    }
  });

  test('menu links land exactly even before the page is idle, and when arriving with a #hash', async ({ page }) => {
    const lands = (id: string) =>
      expect
        .poll(() => page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top)), {
          timeout: LANDING_TIMEOUT,
        })
        .toBeLessThanOrEqual(66)
        .then(() => expect(page.locator(`#${id}`)).toBeInViewport());
    // Click straight after the HTML is parsed, while below-the-fold sections still have estimated sizes.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.hero__nav-link[href="#experience"]').click();
    await lands('experience');
    // Arriving from a sub-page link (/#projects).
    await page.goto('/privacy');
    await page.goto('/#projects');
    await lands('projects');
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
