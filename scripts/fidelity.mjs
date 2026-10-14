/**
 * Section-by-section pixel comparison of the build against the design reference at 1440px.
 *
 *   node scripts/fidelity.mjs [baseUrl=http://localhost:4173] [sections...]
 *
 * Animations are frozen at their start state in both captures (the references were taken
 * the same way by render-design-assets.mjs). Writes actual/diff PNGs to
 * test-results/fidelity/ and prints the mismatch percentage per section.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4173';
const all = ['hero', 'about', 'expertise', 'projects', 'experience', 'reviews', 'contact'];
const only = process.argv.slice(3);
const sections = only.length ? only : all;
const out = path.join(root, 'test-results/fidelity');
await mkdir(out, { recursive: true });

const FREEZE =
  '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, bypassCSP: true });
const page = await context.newPage();
await page.goto(base, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: FREEZE });
await page.evaluate(() => document.fonts.ready);

const results = [];
for (const id of sections) {
  const refPath = path.join(root, 'tests/visual/reference', `${id}.png`);
  const ref = PNG.sync.read(await readFile(refPath));
  const selector = id === 'hero' ? '#top' : `#${id}`;
  const el = page.locator(selector);
  if ((await el.count()) === 0) {
    results.push({ id, status: 'missing' });
    continue;
  }
  // Contact = section + footer in the design; capture the matching page region.
  const box = await el.boundingBox();
  const shot = PNG.sync.read(
    await page.screenshot({
      fullPage: true,
      clip: { x: 0, y: box.y + (await page.evaluate(() => window.scrollY)), width: ref.width, height: ref.height },
    }),
  );
  const { width, height } = ref;
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(ref.data, shot.data, diff.data, width, height, { threshold: 0.1 });
  await writeFile(path.join(out, `${id}-actual.png`), PNG.sync.write(shot));
  await writeFile(path.join(out, `${id}-diff.png`), PNG.sync.write(diff));
  results.push({
    id,
    status: 'ok',
    diff: ((mismatched / (width * height)) * 100).toFixed(2) + '%',
    height: box.height,
    refHeight: height,
  });
}
console.table(results);
await browser.close();
