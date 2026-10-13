/**
 * Cuts the approved hero robot out of its pure-black generation background.
 *
 *   node scripts/cutout-robot.mjs <generated.png> [out=src/assets/hero/robot-agent.png]
 *
 * A plain luminance key would also delete the robot's own dark parts (visor, graphite joints,
 * abdomen plates). Instead, background = dark pixels connected to the image border (flood
 * fill); dark regions enclosed by the figure stay opaque. Edges get a soft alpha from
 * luminance so the rim glow fades naturally into the page. The result is trimmed to the
 * figure with a small margin.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
const output = path.resolve(root, process.argv[3] ?? 'src/assets/hero/robot-agent.png');
if (!input) {
  console.error('Usage: node scripts/cutout-robot.mjs <generated.png> [out]');
  process.exit(1);
}

/** Luminance below LOW is background (if reachable from the border); above HIGH is fully opaque. */
const LOW = 14;
const HIGH = 46;

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const n = width * height;
const lum = new Float32Array(n);
for (let i = 0; i < n; i += 1) {
  const o = i * 3;
  lum[i] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
}

// Flood-fill the background: dark pixels reachable from the image border.
const background = new Uint8Array(n);
const queue = new Int32Array(n);
let head = 0;
let tail = 0;
const push = (i) => {
  if (!background[i] && lum[i] < LOW) {
    background[i] = 1;
    queue[tail++] = i;
  }
};
for (let x = 0; x < width; x += 1) {
  push(x);
  push((height - 1) * width + x);
}
for (let y = 0; y < height; y += 1) {
  push(y * width);
  push(y * width + width - 1);
}
while (head < tail) {
  const i = queue[head++];
  const x = i % width;
  if (x > 0) push(i - 1);
  if (x < width - 1) push(i + 1);
  if (i >= width) push(i - width);
  if (i < n - width) push(i + width);
}

// Alpha: enclosed regions are solid; border-connected pixels fade by luminance.
const rgba = Buffer.alloc(n * 4);
let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let i = 0; i < n; i += 1) {
  let a;
  if (!background[i] && lum[i] >= LOW) a = 255;
  else if (background[i]) a = Math.round(Math.min(1, Math.max(0, (lum[i] - 4) / (HIGH - 4))) * 255);
  else a = 255; // enclosed dark pixel (visor, joints)
  const o = i * 4;
  rgba[o] = data[i * 3];
  rgba[o + 1] = data[i * 3 + 1];
  rgba[o + 2] = data[i * 3 + 2];
  rgba[o + 3] = a;
  if (a > 24) {
    const x = i % width;
    const y = (i / width) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

const margin = 24;
const left = Math.max(0, minX - margin);
const top = Math.max(0, minY - margin);
const cropW = Math.min(width, maxX + margin) - left;
const cropH = Math.min(height, maxY + margin) - top;

await mkdir(path.dirname(output), { recursive: true });
await sharp(rgba, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropW, height: cropH })
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`${path.relative(root, output)} ${cropW}x${cropH} (from ${width}x${height})`);
