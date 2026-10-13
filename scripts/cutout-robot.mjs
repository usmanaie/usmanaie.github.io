/**
 * Cuts the approved hero robot out of its pure-black generation background.
 *
 *   node scripts/cutout-robot.mjs <generated.png> [out=src/assets/hero/robot-agent.png]
 *
 * A plain luminance key would also delete the robot's own dark parts (visor, graphite joints,
 * abdomen plates). Instead, background = dark pixels connected to the image border (flood
 * fill); dark regions enclosed by the figure stay opaque unless they are almost entirely
 * pure black (a gap between an arm and the body). Edges get a soft alpha from luminance, starting
 * just above the image's own background level, so the rim glow fades naturally into the page.
 * The result is trimmed to the figure with a small margin.
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
/** An enclosed dark region is background when this share of it is pure black (lum < 5). */
const GAP_BLACK_SHARE = 0.8;
/** Alpha above which a pixel counts as part of the figure when trimming. */
const SOLID = 24;
const MARGIN = 24;

async function cutout(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
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

  // Enclosed dark regions: background if almost entirely pure black (a gap the arm encloses);
  // otherwise part of the robot (visor, joints, abdomen plates are dark but not pure black).
  for (let s = 0; s < n; s += 1) {
    if (background[s] || lum[s] >= LOW) continue;
    head = 0;
    tail = 0;
    background[s] = 2;
    queue[tail++] = s;
    let black = 0;
    while (head < tail) {
      const i = queue[head++];
      if (lum[i] < 5) black += 1;
      const x = i % width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (j >= 0 && j < n && !background[j] && lum[j] < LOW) {
          background[j] = 2;
          queue[tail++] = j;
        }
      }
    }
    const isGap = black / tail >= GAP_BLACK_SHARE;
    for (let k = 0; k < tail; k += 1) background[queue[k]] = isGap ? 1 : 3;
  }

  // Alpha ramps up from just above the background's own level (some generations are not pure black).
  const borderLum = [];
  for (let x = 0; x < width; x += 1) borderLum.push(lum[x], lum[(height - 1) * width + x]);
  borderLum.sort((a, b) => a - b);
  const floor = Math.max(4, (borderLum[Math.floor(borderLum.length * 0.95)] ?? 0) + 1);
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) {
    const a = background[i] === 1 ? Math.round(Math.min(1, Math.max(0, (lum[i] - floor) / (HIGH - floor))) * 255) : 255;
    const o = i * 4;
    rgba[o] = data[i * 3];
    rgba[o + 1] = data[i * 3 + 1];
    rgba[o + 2] = data[i * 3 + 2];
    rgba[o + 3] = a;
  }
  return { rgba, width, height };
}

const { rgba, width, height } = await cutout(input);
let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let i = 0; i < width * height; i += 1) {
  if (rgba[i * 4 + 3] <= SOLID) continue;
  const x = i % width;
  const y = (i / width) | 0;
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
}
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
