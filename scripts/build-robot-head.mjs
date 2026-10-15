/**
 * Builds the hero robot: one fixed body with the front-facing head, plus the head box the page animates.
 *
 *   node scripts/build-robot-head.mjs <body.png> <head-frame.png>... [--default <i>]
 *
 * Head frames are AI generations of the same robot with the head at different angles, ordered left to right
 * (as seen by the viewer). Frame `--default` (0 unless given) becomes the static robot (robot-agent.png); the page
 * uses the front-facing one (index 2 of the README's list). Only each frame's head is used:
 *  1. Each frame is aligned to the body by matching the torso (translation search).
 *  2. Above the collar (SEAM) the frame's head and neck replace the body's, blending into the body over
 *     FEATHER rows, so every composite is identical below the seam.
 *  3. Each composite is cut out (lib/cutout.mjs) and all are trimmed to one shared box.
 *  4. The head box is every column above the seam that differs between the frames: the room a head needs to
 *     turn. scripts/build-head-layers.py cuts the animated head layers to it, and the page masks it out of the
 *     photo while its canvas is live.
 *
 * Outputs (src/assets/hero/):
 *   robot-agent.png   the default composite (the LCP image)
 *   robot-head.json   the trimmed size, the seam and the head box, as fractions
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { cutout, figureBox } from './lib/cutout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const defaultAt = args.indexOf('--default');
const DEFAULT_FRAME = defaultAt >= 0 ? Number(args.splice(defaultAt, 2)[1]) : 0;
const [bodyFile, ...frameFiles] = args;
if (!bodyFile || frameFiles.length < 2) {
  console.error('Usage: node scripts/build-robot-head.mjs <body.png> <head-frame.png>... [--default <i>]');
  process.exit(1);
}

/** Source rows (in the 1696x2528 generations): the collar line, and the blend band above it. */
const SEAM = 505;
const FEATHER = 40;
/** Torso region used to align frames to the body. */
const TORSO = { x0: 560, x1: 1150, y0: 530, y1: 900 };
const SEARCH = 32;
const MARGIN = 24;
/**
 * Keep the top of the figure only: the hero's stage crops the robot at the shins, so the rest
 * never shows (and would only add bytes to the LCP image).
 */
const VISIBLE = 0.875;
/**
 * A column is part of the head box when, in some frame, more than CHANGE_SHARE of its rows above the seam
 * differ from the default frame by more than CHANGE_THRESHOLD (ignores blend and background noise).
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
console.log(`trim box: left ${left}, top ${top}, ${trimW}x${trimH}`);
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

// Head box: the columns above the seam that differ between the frames (the shoulders in the band never move).
const bands = await Promise.all(
  cutouts.map(async (c) =>
    sharp(await trimmed(c).png().toBuffer())
      .extract({ left: 0, top: 0, width: trimW, height: seam })
      .ensureAlpha()
      .raw()
      .toBuffer(),
  ),
);
const base = bands[DEFAULT_FRAME];
const changed = new Uint32Array(trimW);
for (const raw of bands) {
  const perColumn = new Uint32Array(trimW);
  for (let p = 0; p < raw.length / 4; p += 1) {
    const o = p * 4;
    const diff = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(raw[o + c] - base[o + c])));
    if (diff > CHANGE_THRESHOLD) perColumn[p % trimW] += 1;
  }
  for (let x = 0; x < trimW; x += 1) changed[x] = Math.max(changed[x], perColumn[x]);
}
const moving = [...changed.keys()].filter((x) => changed[x] > seam * CHANGE_SHARE);
// Margins around the moving columns. The left one is 19 px: the box the head layers and masks were cut to came
// from the head-turn in-betweens (since removed), which reached 3 px further left than the source frames.
const x0 = Math.max(0, Math.min(...moving) - 19);
const x1 = Math.min(trimW, Math.max(...moving) + 17);

const fraction = (v) => Math.round(v * 1e6) / 1e6;
const meta = {
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
console.log(`robot-agent.png ${trimW}x${trimH}`, meta);
