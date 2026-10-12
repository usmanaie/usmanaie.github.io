/**
 * Derives static image assets from committed sources.
 *
 *   src/assets/hero/agent.png  ->  src/assets/hero/agent-2x.png
 *     INTERIM: the supplied art is 379x598, below its 498x785 display size. A Lanczos 2x
 *     upscale (758x1196) meets the >= 1.5x resolution Lighthouse expects until the owner
 *     supplies a real high-resolution source (LAUNCH_CHECKLIST item 13). Replace agent.png
 *     with the new art and re-run this script; nothing else changes.
 *
 *   src/assets/hero/agent.png  ->  src/assets/hero/agent-mask.webp
 *     Alpha-only mask for the hero "fluid fill". Generated from the displayed image so the
 *     mask always matches it, and small enough not to cost a second full PNG download.
 *
 *   src/assets/brand/icon.svg  ->  public/favicon-32.png, apple-touch-icon.png,
 *                                  icon-192.png, icon-512.png, icon-maskable-512.png
 *
 * Run with: pnpm images
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/assets/hero/agent.png');
const mask = path.join(root, 'src/assets/hero/agent-mask.webp');

const { width, height } = await sharp(src).metadata();

const upscaled = path.join(root, 'src/assets/hero/agent-2x.png');
await sharp(src)
  .resize(width * 2, height * 2, { kernel: 'lanczos3' })
  .png({ compressionLevel: 9 })
  .toFile(upscaled);
console.log(`agent-2x.png ${width * 2}x${height * 2}`);
const alpha = await sharp(src).ensureAlpha().extractChannel('alpha').toBuffer();

await sharp({ create: { width, height, channels: 3, background: '#000000' } })
  .joinChannel(alpha)
  .webp({ quality: 80, alphaQuality: 80, effort: 6 })
  .toFile(mask);

const info = await sharp(mask).metadata();
console.log(`agent-mask.webp ${info.width}x${info.height}`);

const icon = path.join(root, 'src/assets/brand/icon.svg');
const pub = path.join(root, 'public');
const BG = '#05060B';
for (const [name, size] of [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  await sharp(icon, { density: 1200 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(pub, name));
}
// Maskable: artwork inside the 80% safe zone on a full-bleed background.
const inner = await sharp(icon, { density: 1200 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: inner, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(pub, 'icon-maskable-512.png'));
console.log('icons: favicon-32, apple-touch-icon, icon-192, icon-512, icon-maskable-512');
