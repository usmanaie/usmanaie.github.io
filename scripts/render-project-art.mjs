/**
 * Renders the project illustrations from their HTML sources at 2x, the 1206 x 928 every card's image is.
 *
 *   node scripts/render-project-art.mjs              every source in scripts/art
 *   node scripts/render-project-art.mjs dairector    just these
 *
 * Source: scripts/art/<name>.html. Output: src/assets/projects/<name>.png (committed). Each is made in code (no
 * screenshot, no generated image), so it can be changed and rendered again at any time.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const art = path.join(root, 'scripts/art');
const asked = process.argv.slice(2);
const names = asked.length
  ? asked
  : (await readdir(art)).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -'.html'.length));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 603, height: 464 }, deviceScaleFactor: 2 });
for (const name of names) {
  const out = path.join(root, 'src/assets/projects', `${name}.png`);
  await page.goto(pathToFileURL(path.join(art, `${name}.html`)).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out });
  console.log('rendered', path.relative(root, out));
}
await browser.close();
