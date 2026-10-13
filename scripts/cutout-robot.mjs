/**
 * Cuts the hero robot and its poses out of their pure-black generation backgrounds and
 * aligns them on one shared canvas, so the hero can crossfade between poses in place.
 *
 *   node scripts/cutout-robot.mjs <base.png> [user=<png>] [llm=<png>] [rag=<png>] [tools=<png>] [guardrails=<png>]
 *
 * Outputs:
 *   src/assets/hero/robot-agent.png         the base pose trimmed to the figure (the LCP image)
 *   src/assets/hero/poses/robot-<id>.webp   one per pose, on the shared canvas
 *   src/assets/hero/robot-layout.json       canvas size + where the base figure sits on it
 *
 * A plain luminance key would also delete the robot's own dark parts (visor, graphite joints,
 * abdomen plates). Instead, background = dark pixels connected to the image border (flood
 * fill); dark regions enclosed by the figure stay opaque unless they are almost entirely
 * pure black (a gap between an arm and the body). Edges get a soft alpha from luminance, starting
 * just above the image's own background level, so the rim glow fades naturally into the page.
 *
 * Alignment: each pose is scaled so its head-to-feet height matches the base, then moved so
 * its feet and the centre of its legs land where the base's do. Arms (which differ per pose)
 * are ignored when measuring. The canvas is the union of every aligned figure plus a margin.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [baseInput, ...poseArgs] = process.argv.slice(2);
if (!baseInput) {
  console.error('Usage: node scripts/cutout-robot.mjs <base.png> [pose=<png> ...]');
  process.exit(1);
}
const poses = poseArgs.map((arg) => {
  const [id, file] = arg.split('=');
  if (!id || !file || !/^[a-z]+$/.test(id)) throw new Error(`Bad pose argument: ${arg}`);
  return { id, file };
});

/** Luminance below LOW is background (if reachable from the border); above HIGH is fully opaque. */
const LOW = 14;
const HIGH = 46;
/** An enclosed dark region is background when this share of it is pure black (lum < 5). */
const GAP_BLACK_SHARE = 0.8;
/** Alpha above which a pixel counts as part of the figure when measuring. */
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
  return { rgba, width, height, ...measure(rgba, width, height) };
}

/** Bounding box, feet line, leg centre and head top (arms excluded) of the figure. */
function measure(rgba, width, height) {
  const solid = (x, y) => rgba[(y * width + x) * 4 + 3] > SOLID;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!solid(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  // Legs: the bottom 35% of the figure (no arm reaches that low).
  const legsTop = Math.round(maxY - (maxY - minY) * 0.35);
  let sum = 0;
  let count = 0;
  for (let y = legsTop; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (solid(x, y)) {
        sum += x;
        count += 1;
      }
    }
  }
  const legX = sum / count;
  // Head: the highest solid pixel in a band above the legs (a raised hand lies outside it).
  const band = (maxY - minY) * 0.1;
  let headY = maxY;
  for (let y = minY; y <= maxY && headY === maxY; y += 1) {
    for (let x = Math.max(0, Math.round(legX - band)); x <= Math.min(width - 1, Math.round(legX + band)); x += 1) {
      if (solid(x, y)) {
        headY = y;
        break;
      }
    }
  }
  return { box: { minX, minY, maxX, maxY }, legX, feetY: maxY, headY };
}

const base = await cutout(baseInput);
const baseHeight = base.feetY - base.headY;
const layers = [{ id: 'agent', image: base, scale: 1, dx: 0, dy: 0 }];
for (const pose of poses) {
  const image = await cutout(pose.file);
  const scale = baseHeight / (image.feetY - image.headY);
  // Pose pixel (x, y) lands at (x * scale + dx, y * scale + dy) in base coordinates.
  const dx = base.legX - image.legX * scale;
  const dy = base.feetY - image.feetY * scale;
  layers.push({ id: pose.id, image, scale, dx, dy });
  console.log(`${pose.id}: scale ${scale.toFixed(3)}, shift ${dx.toFixed(1)}, ${dy.toFixed(1)}`);
}

// Canvas: the union of every aligned figure, plus a margin, in base pixel coordinates.
let left = Infinity;
let top = Infinity;
let right = -Infinity;
let bottom = -Infinity;
for (const { image, scale, dx, dy } of layers) {
  left = Math.min(left, image.box.minX * scale + dx);
  top = Math.min(top, image.box.minY * scale + dy);
  right = Math.max(right, image.box.maxX * scale + dx);
  bottom = Math.max(bottom, image.box.maxY * scale + dy);
}
left = Math.floor(left - MARGIN);
top = Math.floor(top - MARGIN);
const canvas = { width: Math.ceil(right + MARGIN) - left, height: Math.ceil(bottom + MARGIN) - top };

async function place({ image, scale, dx, dy }) {
  const w = Math.round(image.width * scale);
  const h = Math.round(image.height * scale);
  const scaled = await sharp(image.rgba, { raw: { width: image.width, height: image.height, channels: 4 } })
    .resize(w, h)
    .raw()
    .toBuffer();
  // Crop the scaled image to the part that falls on the canvas, then composite it there.
  const x = Math.round(dx) - left;
  const y = Math.round(dy) - top;
  const cropLeft = Math.max(0, -x);
  const cropTop = Math.max(0, -y);
  const cropW = Math.min(w, canvas.width - x) - cropLeft;
  const cropH = Math.min(h, canvas.height - y) - cropTop;
  const part = await sharp(scaled, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .png()
    .toBuffer();
  return sharp({ create: { ...canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: part, left: x + cropLeft, top: y + cropTop },
  ]);
}

const heroDir = path.join(root, 'src/assets/hero');
await mkdir(path.join(heroDir, 'poses'), { recursive: true });
// Where the base figure (trimmed with the margin) sits on the canvas: the stage layout is
// defined against it, so adding poses never moves the robot or changes the LCP image.
const figure = {
  left: base.box.minX - MARGIN - left,
  top: base.box.minY - MARGIN - top,
  width: base.box.maxX - base.box.minX + 2 * MARGIN,
  height: base.box.maxY - base.box.minY + 2 * MARGIN,
};

for (const layer of layers) {
  const placed = await (await place(layer)).png().toBuffer();
  if (layer.id === 'agent') {
    const out = path.join(heroDir, 'robot-agent.png');
    await sharp(placed).extract(figure).png({ compressionLevel: 9 }).toFile(out);
    console.log(`${path.relative(root, out)} ${figure.width}x${figure.height}`);
  } else {
    const out = path.join(heroDir, `poses/robot-${layer.id}.webp`);
    await sharp(placed).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(out);
    console.log(`${path.relative(root, out)} ${canvas.width}x${canvas.height}`);
  }
}

const layout = { canvas, figure, poses: poses.map((p) => p.id) };
await writeFile(path.join(heroDir, 'robot-layout.json'), `${JSON.stringify(layout, null, 2)}\n`);
console.log('robot-layout.json', JSON.stringify(layout));
