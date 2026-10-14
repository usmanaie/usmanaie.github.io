/**
 * Renders the Expertise ring layers and visual-regression references from the design export.
 *
 *   node scripts/render-design-assets.mjs <path-to-unzipped-design>
 *
 * Produces (all committed):
 *   src/assets/expertise/ring-*.png    pre-rendered neon ring glow layers at 2x
 *   tests/visual/reference/*.png       1440px section references for fidelity checks
 *
 * Project illustrations are not rendered here: they are made in code (scripts/art/<name>.html)
 * and rendered by render-project-art.mjs, so this script never writes to src/assets/projects/.
 *
 * The design tool runtime is only executed here, at build time, inside Playwright.
 * Nothing from the export is shipped.
 */
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const designDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!designDir) {
  console.error('Usage: node scripts/render-design-assets.mjs <design-export-dir>');
  process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const file = path.join(designDir, decodeURIComponent(url.pathname));
  if (!file.startsWith(designDir)) {
    res.writeHead(403).end();
    return;
  }
  try {
    await stat(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
const base = `http://localhost:${port}`;

const browser = await chromium.launch();
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}';

async function open(file, { width, height, scale }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.goto(`${base}/${file}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return page;
}

/* ---------- Expertise ring layers ---------- */
{
  const out = path.join(root, 'src/assets/expertise');
  await mkdir(out, { recursive: true });
  // The 800x800 ring's blur filters bleed ~80px outside its box; capture with a margin.
  const MARGIN = 80;
  for (const layer of ['glow', 'rings']) {
    const page = await open('Expertise.dc.html', { width: 1440, height: 900, scale: 2 });
    const box = await page.evaluate(
      ({ layer, margin }) => {
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';
        const section = document.getElementById('expertise');
        section.style.background = 'transparent';
        for (const el of section.children) if (el.tagName.toLowerCase() !== 'svg') el.style.visibility = 'hidden';
        const svg = section.querySelector('svg');
        for (const child of svg.children) {
          if (child.tagName.toLowerCase() === 'defs') continue;
          const isGlow = child.classList.contains('breathe');
          const isTicks = child.classList.contains('xr-spin');
          const keep = layer === 'glow' ? isGlow : !isGlow && !isTicks;
          if (!keep) child.style.display = 'none';
        }
        const r = svg.getBoundingClientRect();
        return { x: r.x - margin, y: r.y - margin, width: r.width + margin * 2, height: r.height + margin * 2 };
      },
      { layer, margin: MARGIN },
    );
    await page.setViewportSize({ width: 1440, height: Math.ceil(box.y + box.height) + 10 });
    await page.screenshot({ path: path.join(out, `ring-${layer}.png`), clip: box, omitBackground: true });
    await page.close();
  }
  console.log('expertise: rendered ring layers');
}

/* ---------- 1440px visual references ---------- */
{
  const out = path.join(root, 'tests/visual/reference');
  await mkdir(out, { recursive: true });
  const page = await open('Portfolio.dc.html', { width: 1440, height: 7152, scale: 1 });
  // The sections fidelity.mjs compares. The export still has #education, but the site doesn't.
  const sections = ['hero', 'about', 'expertise', 'projects', 'experience', 'reviews', 'contact'];
  for (const id of sections) {
    const locator = id === 'hero' ? page.locator('main > div').first() : page.locator(`#${id}`);
    await locator.screenshot({ path: path.join(out, `${id}.png`) });
  }
  await page.close();
  console.log('reference: captured', sections.length, 'sections');
}

await browser.close();
server.close();
