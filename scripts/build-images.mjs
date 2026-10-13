/**
 * Derives static image assets from committed sources.
 *
 *   src/assets/hero/robot-agent.png  ->  src/assets/hero/robot-agent-mask.webp
 *     Alpha-only silhouette for the robot's "energy fill" (CSS mask). Derived from the
 *     displayed cut-out, so the fill always matches the artwork; small (no colour data).
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
const robot = path.join(root, 'src/assets/hero/robot-agent.png');
const robotMask = path.join(root, 'src/assets/hero/robot-agent-mask.webp');
const { width: rw, height: rh } = await sharp(robot).metadata();
const maskWidth = 386;
const maskHeight = Math.round((rh * maskWidth) / rw);
const alpha = await sharp(robot).resize(maskWidth, maskHeight).ensureAlpha().extractChannel('alpha').toBuffer();
await sharp({ create: { width: maskWidth, height: maskHeight, channels: 3, background: '#000000' } })
  .joinChannel(alpha)
  .webp({ quality: 70, alphaQuality: 80, effort: 6 })
  .toFile(robotMask);
console.log(`robot-agent-mask.webp ${maskWidth}x${maskHeight}`);

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
