/**
 * Cuts the approved hero robot out of its pure-black generation background (see lib/cutout.mjs)
 * and trims it to the figure with a small margin.
 *
 *   node scripts/cutout-robot.mjs <generated.png> [out=src/assets/hero/robot-agent.png]
 *
 * The animated head is built by scripts/build-robot-head.mjs, which also writes robot-agent.png.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { cutout, figureBox } from './lib/cutout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
const output = path.resolve(root, process.argv[3] ?? 'src/assets/hero/robot-agent.png');
if (!input) {
  console.error('Usage: node scripts/cutout-robot.mjs <generated.png> [out]');
  process.exit(1);
}
const MARGIN = 24;

const { rgba, width, height } = await cutout(input);
const { minX, minY, maxX, maxY } = figureBox(rgba, width, height);
const left = Math.max(0, minX - MARGIN);
const top = Math.max(0, minY - MARGIN);
const cropW = Math.min(width, maxX + MARGIN) - left;
const cropH = Math.min(height, maxY + MARGIN) - top;

await mkdir(path.dirname(output), { recursive: true });
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropW, height: cropH })
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`${path.relative(root, output)} ${cropW}x${cropH} (from ${width}x${height})`);
