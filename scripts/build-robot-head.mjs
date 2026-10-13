/**
 * Builds the hero robot with an animated head: one fixed body, and a head that turns smoothly
 * between the AI-generated head frames (owner request: face the user, front, then right).
 *
 *   node scripts/build-robot-head.mjs <body.png> <head-frame.png>... [--preview <out.webp>]
 *
 * Head frames are ordered left to right (as seen by the viewer); frame 0 faces the USER bubble
 * and is the static default (first paint, no-JS, reduced motion). Every frame is a full
 * generation of the same robot; only its head is used:
 *  1. Each frame is aligned to the body by matching the torso (translation search).
 *  2. Above the collar (SEAM) the frame's head and neck replace the body's, blending into the
 *     body over FEATHER rows, so every composite is identical below the seam.
 *  3. Each composite is cut out (lib/cutout.mjs) and all are trimmed to one shared box.
 *  4. scripts/tween-head.py morphs in-between frames along the optical flow between
 *     neighbouring keys, so the head turns smoothly instead of crossfading.
 *
 * Outputs (src/assets/hero/):
 *   robot-agent.png         the default composite (the LCP image)
 *   robot-head-sprite.webp  the head box (the band above the seam, cropped to the columns that
 *                           change) for every frame, stacked vertically
 *   robot-head.json         frame count, the frame index of each key, the head box as fractions
 * The page swaps only that band, so the body never moves or flickers.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { cutout, figureBox } from './lib/cutout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const previewAt = args.indexOf('--preview');
const preview = previewAt >= 0 ? args.splice(previewAt, 2)[1] : undefined;
const [bodyFile, ...frameFiles] = args;
if (!bodyFile || frameFiles.length < 2) {
  console.error('Usage: node scripts/build-robot-head.mjs <body.png> <head-frame.png>... [--preview out.webp]');
  process.exit(1);
}

/** Source rows (in the 1696x2528 generations): the collar line, and the blend band above it. */
const SEAM = 505;
const FEATHER = 40;
/** Torso region used to align frames to the body. */
const TORSO = { x0: 560, x1: 1150, y0: 530, y1: 900 };
const SEARCH = 32;
const DEFAULT_FRAME = 0;
const MARGIN = 24;
/**
 * Keep the top of the figure only: the hero's stage crops the robot at the shins, so the rest
 * never shows (and would only add bytes to the LCP image).
 */
const VISIBLE = 0.875;
/** Sprite resolution relative to the cut-out (the robot is drawn ~200-240 CSS px wide). */
const SPRITE_SCALE = 0.51;
/**
 * A column is part of the head box when, in some frame, more than CHANGE_SHARE of its rows differ
 * from the default frame by more than CHANGE_THRESHOLD (ignores blend and background noise).
 */
const CHANGE_THRESHOLD = 24;
const CHANGE_SHARE = 0.02;

async function load(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function luma(img) {
  const out = new Float32Array(img.width * img.height);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = 0.2126 * img.data[i * 3] + 0.7152 * img.data[i * 3 + 1] + 0.0722 * img.data[i * 3 + 2];
  }
  return out;
}

/** Offset (dx, dy) so that frame(x + dx, y + dy) best matches body(x, y) over the torso. */
function align(bodyL, frameL, width, height) {
  const cost = (dx, dy, step) => {
    let sum = 0;
    for (let y = TORSO.y0; y < TORSO.y1; y += step) {
      const fy = Math.min(height - 1, Math.max(0, y + dy));
      for (let x = TORSO.x0; x < TORSO.x1; x += step) {
        const fx = Math.min(width - 1, Math.max(0, x + dx));
        sum += Math.abs(bodyL[y * width + x] - frameL[fy * width + fx]);
      }
    }
    return sum;
  };
  let best = { dx: 0, dy: 0, c: Infinity };
  for (let dy = -SEARCH; dy <= SEARCH; dy += 4) {
    for (let dx = -SEARCH; dx <= SEARCH; dx += 4) {
      const c = cost(dx, dy, 6);
      if (c < best.c) best = { dx, dy, c };
    }
  }
  const coarse = best;
  for (let dy = coarse.dy - 4; dy <= coarse.dy + 4; dy += 1) {
    for (let dx = coarse.dx - 4; dx <= coarse.dx + 4; dx += 1) {
      const c = cost(dx, dy, 2);
      if (c < best.c || (dx === coarse.dx && dy === coarse.dy)) best = { dx, dy, c: Math.min(c, best.c) };
    }
  }
  return best;
}

function composite(body, frame, { dx, dy }) {
  const { width, height } = body;
  const out = Buffer.from(body.data);
  for (let y = 0; y < SEAM; y += 1) {
    const w = y < SEAM - FEATHER ? 1 : (SEAM - y) / FEATHER;
    const fy = Math.min(height - 1, Math.max(0, y + dy));
    for (let x = 0; x < width; x += 1) {
      const fx = Math.min(width - 1, Math.max(0, x + dx));
      const o = (y * width + x) * 3;
      const f = (fy * width + fx) * 3;
      for (let c = 0; c < 3; c += 1) out[o + c] = Math.round(w * frame.data[f + c] + (1 - w) * body.data[o + c]);
    }
  }
  return { data: out, width, height };
}

const body = await load(bodyFile);
const bodyL = luma(body);
const cutouts = [];
for (const file of frameFiles) {
  const frame = await load(file);
  if (frame.width !== body.width || frame.height !== body.height) throw new Error(`${file}: size differs from body`);
  const offset = align(bodyL, luma(frame), body.width, body.height);
  console.log(`${path.basename(file)}: offset ${offset.dx}, ${offset.dy}`);
  cutouts.push(await cutout(composite(body, frame, offset)));
}

// One trim box for every composite (heads differ slightly in extent).
const boxes = cutouts.map((c) => figureBox(c.rgba, c.width, c.height));
const left = Math.max(0, Math.min(...boxes.map((b) => b.minX)) - MARGIN);
const top = Math.max(0, Math.min(...boxes.map((b) => b.minY)) - MARGIN);
const trimW = Math.min(body.width, Math.max(...boxes.map((b) => b.maxX)) + MARGIN) - left;
const trimH = Math.round((Math.min(body.height, Math.max(...boxes.map((b) => b.maxY)) + MARGIN) - top) * VISIBLE);
const seam = SEAM - top;
const trimmed = (c) =>
  sharp(c.rgba, { raw: { width: c.width, height: c.height, channels: 4 } }).extract({
    left,
    top,
    width: trimW,
    height: trimH,
  });

const heroDir = path.join(root, 'src/assets/hero');
await mkdir(heroDir, { recursive: true });
await trimmed(cutouts[DEFAULT_FRAME]).png({ compressionLevel: 9 }).toFile(path.join(heroDir, 'robot-agent.png'));

// Key bands (above the seam) -> in-betweens (tween-head.py) -> sprite, stacked vertically.
// HEAD_WORK keeps the key bands and frames for inspection.
const keepWork = process.env['HEAD_WORK'];
const work = keepWork ?? (await mkdtemp(path.join(os.tmpdir(), 'robot-head-')));
await mkdir(work, { recursive: true });
await Promise.all(
  cutouts.map(async (c, i) =>
    sharp(await trimmed(c).png().toBuffer())
      .extract({ left: 0, top: 0, width: trimW, height: seam })
      .png()
      .toFile(path.join(work, `key-${i}.png`)),
  ),
);
const tween = spawnSync('python', [path.join(root, 'scripts/tween-head.py'), work], { stdio: 'inherit' });
if (tween.status !== 0) throw new Error('tween-head.py failed');
const { count, keys } = JSON.parse(await readFile(path.join(work, 'frames.json'), 'utf8'));
const framePaths = Array.from({ length: count }, (_, i) => path.join(work, `frame-${String(i).padStart(3, '0')}.png`));

// Only the columns that change between frames go into the sprite (the shoulders in the band
// never move); the page masks exactly that box out of the photo.
const raws = await Promise.all(framePaths.map((f) => sharp(f).ensureAlpha().raw().toBuffer()));
const base = raws[keys[DEFAULT_FRAME]];
const changed = new Uint32Array(trimW);
for (const raw of raws) {
  const perColumn = new Uint32Array(trimW);
  for (let p = 0; p < raw.length / 4; p += 1) {
    const o = p * 4;
    const diff = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(raw[o + c] - base[o + c])));
    if (diff > CHANGE_THRESHOLD) perColumn[p % trimW] += 1;
  }
  for (let x = 0; x < trimW; x += 1) changed[x] = Math.max(changed[x], perColumn[x]);
}
const moving = [...changed.keys()].filter((x) => changed[x] > seam * CHANGE_SHARE);
let x0 = Math.min(...moving);
let x1 = Math.max(...moving);
x0 = Math.max(0, x0 - 16);
x1 = Math.min(trimW, x1 + 17);
const spriteW = Math.round((x1 - x0) * SPRITE_SCALE);
const bandH = Math.round(seam * SPRITE_SCALE);
const bands = await Promise.all(
  framePaths.map((f) =>
    sharp(f)
      .extract({ left: x0, top: 0, width: x1 - x0, height: seam })
      .resize(spriteW, bandH)
      .png()
      .toBuffer(),
  ),
);
await sharp({
  create: { width: spriteW, height: bandH * count, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(bands.map((input, i) => ({ input, left: 0, top: i * bandH })))
  .webp({ quality: 62, alphaQuality: 70, effort: 6 })
  .toFile(path.join(heroDir, 'robot-head-sprite.webp'));

const fraction = (v) => Math.round(v * 1e6) / 1e6;
const meta = {
  frames: count,
  keys,
  default: keys[DEFAULT_FRAME],
  seam: fraction(seam / trimH),
  headLeft: fraction(x0 / trimW),
  headWidth: fraction((x1 - x0) / trimW),
  width: trimW,
  height: trimH,
};
await writeFile(
  path.join(heroDir, 'robot-head.json'),
  `${JSON.stringify(meta, null, 2)}
`,
);
console.log(`robot-agent.png ${trimW}x${trimH}; sprite ${spriteW}x${bandH} x${count}`, meta);

// Preview: the head turning left -> right -> left at the page's frame rate, over the body.
if (preview) {
  const crop = { left: Math.round(trimW * 0.12), top: 0, width: Math.round(trimW * 0.76), height: seam + 260 };
  const bodyPart = await trimmed(cutouts[DEFAULT_FRAME])
    .extract({ left: 0, top: seam, width: trimW, height: 260 })
    .png()
    .toBuffer();
  const order = [
    ...Array(15).fill(0),
    ...framePaths.keys(),
    ...Array(15).fill(count - 1),
    ...[...framePaths.keys()].toReversed(),
  ];
  const stills = await Promise.all(
    framePaths.map(async (f) => {
      const full = await sharp({
        create: { width: trimW, height: seam + 260, channels: 4, background: '#05060b' },
      })
        .composite([
          { input: bodyPart, left: 0, top: seam },
          { input: f, left: 0, top: 0 },
        ])
        .png()
        .toBuffer();
      return sharp(full)
        .extract(crop)
        .resize(Math.round(crop.width / 2))
        .png()
        .toBuffer();
    }),
  );
  await sharp(
    order.map((i) => stills[i]),
    { join: { animated: true } },
  )
    .webp({ loop: 0, delay: order.map(() => 33), quality: 85 })
    .toFile(preview);
  console.log(`preview ${preview} (${order.length} frames)`);
}
if (!keepWork) await rm(work, { recursive: true, force: true });
