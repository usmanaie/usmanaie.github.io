/**
 * Renders Dairector's project illustration from its HTML source at 2x, the size the other illustrations are.
 *
 *   node scripts/render-dairector-art.mjs
 *
 * Source: scripts/art/dairector.html. Output: src/assets/projects/dairector.png (committed). The page is made in
 * code (no screenshot, no generated image), so it can be changed and rendered again at any time.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = pathToFileURL(path.join(root, 'scripts/art/dairector.html')).href;
const out = path.join(root, 'src/assets/projects/dairector.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 603, height: 464 }, deviceScaleFactor: 2 });
await page.goto(source, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: out });
await browser.close();
console.log('rendered', path.relative(root, out));
