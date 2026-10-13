/**
 * Derives static image assets from committed sources.
 *
 *   src/assets/hero/robot-agent.png  ->  src/assets/hero/robot-agent-mask.webp
 *     Alpha-only silhouette for the robot's "energy fill" (CSS mask). Derived from the
 *     displayed cut-out, so the fill always matches the artwork; small (no colour data).
 *     Also robot-agent-mask-body.webp without the head band (above the seam in
 *     robot-head.json): while the head turns on its canvas, the fill there is drawn by
 *     scripts/hero.ts instead.
 *
 *   src/assets/brand/icon.svg  ->  public/favicon-32.png, apple-touch-icon.png,
 *                                  icon-192.png, icon-512.png, icon-maskable-512.png
 *
 * Run with: pnpm images
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const robot = path.join(root, 'src/assets/hero/robot-agent.png');
const robotMask = path.join(root, 'src/assets/hero/robot-agent-mask.webp');
const { width: rw, height: rh } = await sharp(robot).metadata();
const maskWidth = 386;
const maskHeight = Math.round((rh * maskWidth) / rw);
const head = JSON.parse(await readFile(path.join(root, 'src/assets/hero/robot-head.json'), 'utf8'));
const alpha = await sharp(robot).resize(maskWidth, maskHeight).ensureAlpha().extractChannel('alpha').raw().toBuffer();
const writeMask = (channel, file) =>
  sharp({ create: { width: maskWidth, height: maskHeight, channels: 3, background: '#000000' } })
    .joinChannel(channel, { raw: { width: maskWidth, height: maskHeight, channels: 1 } })
    .webp({ quality: 70, alphaQuality: 80, effort: 6 })
    .toFile(file);
await writeMask(alpha, robotMask);
const body = Buffer.from(alpha);
body.fill(0, 0, Math.round(head.seam * maskHeight) * maskWidth);
await writeMask(body, path.join(root, 'src/assets/hero/robot-agent-mask-body.webp'));
console.log(`robot-agent-mask.webp, robot-agent-mask-body.webp ${maskWidth}x${maskHeight}`);

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
