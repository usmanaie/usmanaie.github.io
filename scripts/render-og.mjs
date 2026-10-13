/**
 * Renders the 1200x630 Open Graph / Twitter share image from the built hero, in its
 * designed reduced-motion end state (agent filled, orbs lit, connectors drawn).
 *
 *   pnpm build && pnpm preview   (in another terminal)
 *   node scripts/render-og.mjs [baseUrl=http://localhost:4173]
 *
 * Output (committed): public/og.jpg
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4173';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 800 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const png = await page.screenshot({ clip: { x: 0, y: 60, width: 1200, height: 630 } });
await browser.close();

await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(root, 'public/og.jpg'));
console.log('public/og.jpg 1200x630');
