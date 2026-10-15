import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/** Timing of the agent loop (ms). The token's travel time matches --step-travel in CSS. */
export const TIMING = { travel: 1000, dwell: 550, start: 500, hold: 2600 } as const;

/**
 * The head moves like a critically damped spring: it eases in and out, never overshoots, and a
 * new turn that interrupts one in progress carries on smoothly instead of stopping and
 * restarting. Any turn settles (95%) in about this long, in ms.
 */
export const HEAD_TURN_MS = 1200;
/** The eye lights lead the head: the same spring, settling in this long (ms). */
export const EYE_GLIDE_MS = 700;
const omegaFor = (ms: number) => 4.74 / (ms / 1000);
const HEAD_OMEGA = omegaFor(HEAD_TURN_MS);
const EYE_OMEGA = omegaFor(EYE_GLIDE_MS);

/** One step of a spring: new position and velocity (units, units/s) after `dt` s. */
export function springStep(
  pos: number,
  vel: number,
  target: number,
  dt: number,
  omega: number = HEAD_OMEGA,
): [number, number] {
  const accel = -omega * omega * (pos - target) - 2 * omega * vel;
  const v = vel + accel * dt;
  return [pos + v * dt, v];
}

/** A direction the robot attends to: a unit vector, x right, y down (GAZE in hero-flow.ts). */
export type Gaze = readonly [number, number];

/**
 * How much attention moves the head, per unit of gaze away from the front (the photo's own pose; the
 * USER and the LLM are ~0.95 units to either side). The head carries most of it: the helmet turns
 * (`yaw`, degrees: its face slides around the outline, see turnSource), tilts toward the participant
 * (`tilt`, degrees, clockwise when looking right) and shifts a little (`shiftX`, `shiftY`, head-box
 * widths). The eye lights add the last part, gliding across the visor (`eyeX`, `eyeY`, head-box widths).
 * At the USER or the LLM: a 10 degree turn, a 4 degree tilt, a 6 art px shift, a 17 art px glide.
 */
export const POSE = { eyeX: 0.0524, eyeY: 0.026, yaw: 10.5, tilt: 4.19, shiftX: 0.0185, shiftY: 0.015 } as const;

/**
 * The helmet's pose while attending to `gaze`: turn and tilt (radians, clockwise when looking right)
 * and shift (head-box widths).
 */
export function headPose(gaze: Gaze, front: Gaze): { yaw: number; angle: number; dx: number; dy: number } {
  const gx = gaze[0] - front[0];
  const gy = gaze[1] - front[1];
  const rad = Math.PI / 180;
  return { yaw: gx * POSE.yaw * rad, angle: gx * POSE.tilt * rad, dx: gx * POSE.shiftX, dy: gy * POSE.shiftY };
}

/**
 * Where the helmet tilts about, across the chin (head-box widths): at the chin's corner on the side it
 * turns away from, so that side never lifts off the neck. It swings smoothly between the two corners
 * as the tilt passes through zero (`swing`: the corners' distance from the middle).
 */
export function tiltPivot(angle: number, middle: number, swing: number): number {
  return middle - Math.tanh(angle / ((0.5 * Math.PI) / 180)) * swing;
}

/**
 * The turn, along one row of the helmet: the face slides around the outline as on a ball, by
 * `k` (the sine of the turn) of the row's half-width at the middle and not at all at the outline, so the
 * silhouette stays put and the side turning away narrows. For a point `u` across the row (-1 to 1 from
 * outline to outline) after the turn, the point of the photo that lands there.
 */
export function turnSource(u: number, k: number): number {
  if (Math.abs(k) < 1e-6) return u;
  return (1 - Math.sqrt(Math.max(0, 1 - 4 * k * (u - k)))) / (2 * k);
}

/**
 * Turns one row of RGBA pixels (packed 32-bit, as ImageData's buffer): every pixel of the row's
 * outline (`middle` +- `half`, px) takes the photo's point that lands there (turnSource), interpolated
 * linearly. Opaque pixels, most of the helmet, blend in 8-bit fixed point; this runs on every frame of
 * a turn, ~1.4 ms for the whole helmet on a desktop.
 */
export function turnRow(
  src: Uint32Array,
  out: Uint32Array,
  base: number,
  w: number,
  middle: number,
  half: number,
  k: number,
): void {
  const inv2k = 1 / (2 * k);
  const end = Math.min(w, Math.ceil(middle + half));
  for (let x = Math.max(0, Math.floor(middle - half)); x < end; x += 1) {
    let u = (x + 0.5 - middle) / half;
    u = u < -1 ? -1 : u > 1 ? 1 : u;
    const d = 1 - 4 * k * (u - k);
    let sx = middle + half * (1 - Math.sqrt(d > 0 ? d : 0)) * inv2k - 0.5;
    sx = sx < 0 ? 0 : sx > w - 1 ? w - 1 : sx;
    const xi = Math.floor(sx);
    const fi = Math.floor((sx - xi) * 256);
    const gi = 256 - fi;
    const pa = src[base + xi] ?? 0;
    const pb = src[base + Math.min(w - 1, xi + 1)] ?? 0;
    if (pa >>> 24 === 255 && pb >>> 24 === 255) {
      const rb = (((pa & 0xff00ff) * gi + (pb & 0xff00ff) * fi) >>> 8) & 0xff00ff;
      const g = (((pa & 0xff00) * gi + (pb & 0xff00) * fi) >>> 8) & 0xff00;
      out[base + x] = (0xff000000 | rb | g) >>> 0;
      continue;
    }
    const aA = (pa >>> 24) * gi;
    const aB = (pb >>> 24) * fi;
    const alpha = aA + aB;
    if (alpha === 0) {
      out[base + x] = 0;
      continue;
    }
    const channel = (shift: number) =>
      Math.round((((pa >>> shift) & 255) * aA + ((pb >>> shift) & 255) * aB) / alpha) & 255;
    out[base + x] = (((alpha >>> 8) << 24) | (channel(16) << 16) | (channel(8) << 8) | channel(0)) >>> 0;
  }
}

/** Where point `u` of a row lands after the turn (the inverse of turnSource), and how wide it is there. */
export function turnPoint(u: number, k: number): [number, number] {
  return [u + k * (1 - u * u), 1 - 2 * k * u];
}

/**
 * How much of the turn a row of the helmet takes (0-1, eased): all of it down to `from`, none from `to`
 * (head-box heights). The chin stays square on the neck.
 */
export function turnWeight(y: number, [from, to]: readonly [number, number]): number {
  const t = Math.min(1, Math.max(0, (to - y) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * Each row's outline in a helmet layer (`alpha`, `w` x `h`): its middle and half-width in px, smoothed
 * across rows so the turn has no row-to-row jitter. NaN for rows the helmet doesn't reach.
 */
export function helmetRows(alpha: (i: number) => number, w: number, h: number): Float32Array {
  const raw = new Float32Array(h * 2).fill(Number.NaN);
  for (let y = 0; y < h; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < w; x += 1) {
      if (alpha(y * w + x) > 127) {
        if (left < 0) left = x;
        right = x + 1;
      }
    }
    if (right - left > 2) [raw[y * 2], raw[y * 2 + 1]] = [left, right];
  }
  const rows = new Float32Array(h * 2).fill(Number.NaN);
  for (let y = 0; y < h; y += 1) {
    if (Number.isNaN(raw[y * 2] ?? Number.NaN)) continue;
    let sum = 0;
    let left = 0;
    let right = 0;
    for (let j = Math.max(0, y - 6); j < Math.min(h, y + 7); j += 1) {
      const l = raw[j * 2] ?? Number.NaN;
      if (Number.isNaN(l)) continue;
      const weight = Math.exp(-((j - y) ** 2) / 18);
      sum += weight;
      left += l * weight;
      right += (raw[j * 2 + 1] ?? 0) * weight;
    }
    rows[y * 2] = (left + right) / sum / 2;
    rows[y * 2 + 1] = (right - left) / sum / 2;
  }
  return rows;
}

/** How far the eye lights have glided from their place in the photo (head-box widths). */
export function eyeShift(gaze: Gaze, front: Gaze): [number, number] {
  return [(gaze[0] - front[0]) * POSE.eyeX, (gaze[1] - front[1]) * POSE.eyeY];
}

/** A blink (the eye lights dim and narrow, then open) as the robot turns to the other side. */
export const BLINK_MS = 300;

/** The eye lights' height `t` ms into a blink (1 = open): one smooth dip, never a jump. */
export function blinkOpen(t: number): number {
  if (t <= 0 || t >= BLINK_MS) return 1;
  return 1 - (0.85 * (1 - Math.cos((2 * Math.PI * t) / BLINK_MS))) / 2;
}

/**
 * The eye lights' glow, measured from the photo's two lights (averaged): [offset, r, g, b, alpha] stops
 * of a radial gradient drawn with 'screen'. A white-blue disc with a blue halo.
 */
const GLOW = [
  [0, 152, 219, 255, 0.795],
  [0.094, 151, 218, 255, 0.789],
  [0.188, 147, 215, 255, 0.772],
  [0.25, 144, 211, 255, 0.736],
  [0.312, 134, 203, 255, 0.595],
  [0.375, 102, 186, 255, 0.36],
  [0.438, 77, 170, 255, 0.225],
  [0.531, 61, 161, 255, 0.146],
  [0.625, 43, 156, 255, 0.102],
  [0.75, 28, 137, 255, 0.049],
  [0.875, 6, 96, 255, 0.02],
  [1, 0, 127, 255, 0],
] as const;
export const GLOW_STOPS: [number, string][] = GLOW.map(([offset, r, g, b, a]) => [
  offset,
  `rgb(${r} ${g} ${b} / ${a})`,
]);

/** How narrow a light is at the visor's edge (the glass curves away), relative to its width in the middle. */
export const EDGE_WIDTH = 0.78;

/**
 * A light's width at `x` (head-box widths): full where the photo has them (up to `inner` from the
 * visor's middle), easing to EDGE_WIDTH by `outer`.
 */
export function eyeWidth(x: number, [centre, inner, outer]: readonly [number, number, number]): number {
  const t = Math.min(1, Math.max(0, (Math.abs(x - centre) - inner) / (outer - inner)));
  return 1 - (1 - EDGE_WIDTH) * t * t * (3 - 2 * t);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Where the charge fill starts within the head band, as a fraction of the band from its top
 * (1 = not reached yet). The fill rises from the robot's feet; the band is its top `seam`.
 */
export function headFillTop(level: number, seam: number): number {
  return Math.min(1, Math.max(0, (1 - level) / seam));
}

/**
 * The charge fill's gradients, as in AgentFlow.astro's CSS (.flow__charge-level, top to bottom of the
 * robot): blue while the agent works, green over it once the guardrails approve.
 */
export const CHARGE_STOPS = {
  blue: [
    [0, 'rgb(130 210 255 / 55%)'],
    [0.55, 'rgb(90 150 255 / 42%)'],
    [1, 'rgb(255 110 140 / 48%)'],
  ],
  green: [
    [0, 'rgb(120 240 170 / 46%)'],
    [0.55, 'rgb(40 200 130 / 36%)'],
    [1, 'rgb(20 160 110 / 40%)'],
  ],
} as const;

/**
 * Where the CSS fill's gradient runs, in px of a head canvas `h` px tall (the robot's top `seam`): the
 * gradient spans the risen fill, from its top (`level` of the robot, from the feet) to the feet.
 */
export function chargeGradientSpan(level: number, seam: number, h: number): [number, number] {
  return [((1 - level) / seam) * h, h / seam];
}

/**
 * The head canvas's share of the charge fill at (x, y) on a `w` x `h` canvas (0-1). It fades out over
 * `feather` px toward the canvas's sides and bottom, where the body's CSS fill (robot-agent-mask-body,
 * scripts/build-images.mjs: the same ramp, inverted) fades in, so the two always add up to one fill.
 */
export function headChargeShare(x: number, y: number, w: number, h: number, feather: number): number {
  return Math.min(1, Math.max(0, Math.min(x, w - x, h - y) / feather));
}

/** Robot energy level (0-1) once `done` of `total` hops have completed. */
export function levelFor(done: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
}

export interface HopData {
  spoke: string;
  direction: 'out' | 'back';
  to: string;
  label: string;
  approves?: boolean;
}

/** How the head canvas is put together (data-head-rig: HEAD.rig and GAZE in hero-flow.ts). */
export interface HeadRig {
  /** Head-box fractions: the helmet's tilt pivot, the eye lights' centres, the glow's radius (of the width). */
  pivot: [number, number];
  eyes: [number, number][];
  glow: number;
  /** The visor's middle, and the distances from it over which a gliding light narrows (box widths). */
  visor: [number, number, number];
  /** How far (box widths) the head's share of the charge fill fades out toward the box's sides and bottom. */
  chargeFeather: number;
  /** Rows (box heights) over which the turn fades out toward the chin (turnWeight). */
  turnFade: [number, number];
  /** How far (box widths) the tilt's pivot swings from the chin's middle to its corners (tiltPivot). */
  pivotSwing: number;
  gaze: Record<string, Gaze>;
  /** The photo's own pose: facing the visitor. */
  front: Gaze;
}

export function parseRig(json: string | undefined): HeadRig | undefined {
  if (!json) return undefined;
  try {
    const rig = JSON.parse(json) as Partial<HeadRig>;
    const ok =
      Array.isArray(rig.pivot) &&
      Array.isArray(rig.eyes) &&
      typeof rig.glow === 'number' &&
      Array.isArray(rig.visor) &&
      rig.visor.length === 3 &&
      typeof rig.chargeFeather === 'number' &&
      Array.isArray(rig.turnFade) &&
      typeof rig.pivotSwing === 'number' &&
      typeof rig.gaze === 'object' &&
      rig.gaze !== null &&
      Array.isArray(rig.front);
    return ok ? (rig as HeadRig) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Moves a spoke's far end right by `extra` stage units if it is a right-hand spoke (its node right of the agent);
 * the control point moves half as far so the curve keeps its shape. Paths are 'M x0 y0 Q cx cy x1 y1'.
 */
export function spreadSpoke(out: string, back: string, extra: number): { out: string; back: string; shift: number } {
  const n = out.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const [sx, sy, cx, cy, ex, ey] = n;
  if (n.length !== 6 || sx === undefined || ex === undefined || ex <= sx || extra <= 0) return { out, back, shift: 0 };
  const nx = (ex ?? 0) + extra;
  const ncx = (cx ?? 0) + extra / 2;
  return {
    out: `M ${sx} ${sy} Q ${ncx} ${cy} ${nx} ${ey}`,
    back: `M ${nx} ${ey} Q ${ncx} ${cy} ${sx} ${sy}`,
    shift: extra,
  };
}

export function parseHops(json: string | undefined): HopData[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? (value as HopData[]) : [];
  } catch {
    return [];
  }
}

/**
 * Hero agent-loop controller.
 *  - Static HTML shows every participant and connection (no-JS, reduced motion, first paint).
 *  - Once the page is idle, one request plays hop by hop: the agent token travels each spoke
 *    carrying that hop's label ("request", "tool call: retrieve", ...); participants appear
 *    when first reached, the spoke in use is highlighted, and the robot charges as hops complete.
 *  - The robot attends to the participant of each hop with no other picture of its head: on a
 *    canvas over the head (two layers cut from the photo, loaded on first play) the helmet turns,
 *    tilts and shifts toward it, and the eye lights glide the last part, both on springs.
 *  - Pauses while the hero is off-screen or the tab is hidden; the robot replays from the start.
 */
export function initHero(root: Document = document): void {
  const heroEl = root.querySelector<HTMLElement>('[data-hero]');
  const flowEl = heroEl?.querySelector<HTMLElement>('[data-flow]');
  if (!heroEl || !flowEl) return;
  const hero: HTMLElement = heroEl;
  const flow: HTMLElement = flowEl;

  observeVisibility(hero);
  whenIdle(() => hero.removeAttribute('data-intro'));

  const tokenEl = flow.querySelector<HTMLElement>('[data-flow-token]');
  const labelEl = flow.querySelector<HTMLElement>('[data-flow-label]');
  const hops = parseHops(flow.dataset['hops']);
  if (!tokenEl || !labelEl || hops.length === 0) return;
  const token: HTMLElement = tokenEl;
  const label: HTMLElement = labelEl;

  const nodes = new Map(
    [...flow.querySelectorAll<SVGGElement>('[data-flow-node]')].map((n) => [n.dataset['flowNode'], n]),
  );
  const spokes = new Map(
    [...flow.querySelectorAll<SVGGElement>('[data-flow-spoke]')].map((s) => [s.dataset['flowSpoke'], s]),
  );
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let run = 0;

  /*
   * When the hero gives the stage more width than the design's 720 units (desktop windows short enough to scale
   * the composition below the content width), the stage extends to the right of the robot: the right-hand
   * participants move out to the content's edge and their spokes (and the token's paths) are redrawn to match.
   */
  const canvas = flow.querySelector<HTMLElement>('.flow__canvas');
  const trackPaths = [...flow.querySelectorAll<SVGPathElement>('.flow__track path')];
  const base = new Map(
    [...spokes].map(([id, s]) => [id, { out: s.dataset['out'] ?? '', back: s.dataset['back'] ?? '' }]),
  );
  function spread() {
    const scale = canvas ? canvas.getBoundingClientRect().width / 720 : 0;
    const extra = scale > 0 ? Math.max(0, Math.round(flow.getBoundingClientRect().width / scale - 720)) : 0;
    for (const [id, spoke] of spokes) {
      const original = base.get(id);
      if (!id || !original) continue;
      const shifted = spreadSpoke(original.out, original.back, extra);
      spoke.dataset['out'] = shifted.out;
      spoke.dataset['back'] = shifted.back;
      for (const path of spoke.querySelectorAll('path')) path.setAttribute('d', shifted.out);
      for (const path of trackPaths) if (path.dataset['spoke'] === id) path.setAttribute('d', shifted.out);
      nodes.get(id)?.setAttribute('transform', shifted.shift ? `translate(${shifted.shift} 0)` : '');
    }
  }
  // After the first frame: measuring the layout any earlier forces it before the first paint (and delays LCP).
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      spread();
      if ('ResizeObserver' in window) new ResizeObserver(spread).observe(flow);
    }),
  );

  const headCanvas = flow.querySelector<HTMLCanvasElement>('[data-flow-head]');
  const headUrl = flow.dataset['headLayers'];
  const rig = parseRig(flow.dataset['headRig']);
  const headSeam = Number(flow.dataset['headSeam'] ?? 0.2);
  const front: Gaze = rig?.front ?? [0, 0];
  const frameCanvas = document.createElement('canvas');
  /** The charge fill drawn on the head, and the head's share of it (headChargeShare) as alpha. */
  const fillCanvas = document.createElement('canvas');
  const shareCanvas = document.createElement('canvas');
  let headLayers: HTMLImageElement | undefined;
  /** The helmet layer's pixels and outline, and the turned helmet (redrawn when the turn changes). */
  const turnCanvas = document.createElement('canvas');
  let helmetPixels: ImageData | undefined;
  let turned: ImageData | undefined;
  let rows: Float32Array = new Float32Array(0);
  let turnedYaw = Number.NaN;
  /** Where the robot attends, and the eye lights' and the helmet's springs toward it. */
  let target: Gaze = front;
  const eyes = { x: front[0], y: front[1], vx: 0, vy: 0 };
  const helmet = { x: front[0], y: front[1], vx: 0, vy: 0 };
  let blinkFrom = -Infinity;
  let headAnim = 0;
  /** The charge fill on the head, mirroring the CSS fill on the body (level 0-1, green 0-1). */
  const tint = { level: 0, green: 0 };
  let tintAnim = 0;

  /**
   * The helmet turned by `yaw` (radians) on turnCanvas: every row's face slides around its outline
   * (turnSource), resampled linearly along the row; the chin's rows turn less (turnWeight).
   */
  function turnHelmet(yaw: number): CanvasImageSource | undefined {
    if (!helmetPixels || !turned || !rig) return undefined;
    if (Math.abs(yaw) < 1e-4) return undefined;
    // Below this change the face would move < 0.04 px: keep the last turn (the springs' long, slow tail).
    if (Math.abs(yaw - turnedYaw) < 4e-4) return turnCanvas;
    const { width: w, height: h } = turnCanvas;
    const src = new Uint32Array(helmetPixels.data.buffer);
    const out = new Uint32Array(turned.data.buffer);
    out.set(src);
    const fade = [rig.turnFade[0] * h, rig.turnFade[1] * h] as const;
    for (let y = 0; y < h; y += 1) {
      const middle = rows[y * 2] ?? Number.NaN;
      const k = Math.sin(yaw * turnWeight(y + 0.5, fade));
      if (!Number.isNaN(middle) && Math.abs(k) >= 1e-5) turnRow(src, out, y * w, w, middle, rows[y * 2 + 1] ?? 1, k);
    }
    turnCanvas.getContext('2d')?.putImageData(turned, 0, 0);
    turnedYaw = yaw;
    return turnCanvas;
  }

  /**
   * Draws the head: the still neck plate, the helmet turned and tilted toward the participant, the
   * charge fill where it has risen into the head (multiplied like the body's), then the eye lights
   * (riding the turn, and glowing over the fill), all kept to the head's own silhouette; and behind
   * it, the photo's shadow for the head box.
   */
  function drawHead(now = performance.now()) {
    const ctx = headCanvas?.getContext('2d');
    const frameCtx = frameCanvas.getContext('2d');
    if (!headCanvas || !ctx || !frameCtx || !headLayers || !rig) return;
    const { width: w, height: h } = headCanvas;
    const pose = headPose([helmet.x, helmet.y], front);
    const px = tiltPivot(pose.angle, rig.pivot[0], rig.pivotSwing) * w;
    const py = rig.pivot[1] * h;
    const tilt = (c: CanvasRenderingContext2D) => {
      c.translate(px + pose.dx * w, py + pose.dy * w);
      c.rotate(pose.angle);
      c.translate(-px, -py);
    };
    frameCtx.clearRect(0, 0, w, h);
    frameCtx.drawImage(headLayers, 0, h, w, h, 0, 0, w, h);
    frameCtx.save();
    tilt(frameCtx);
    const turnedHelmet = turnHelmet(pose.yaw);
    if (turnedHelmet) frameCtx.drawImage(turnedHelmet, 0, 0);
    else frameCtx.drawImage(headLayers, 0, 0, w, h, 0, 0, w, h);
    frameCtx.restore();

    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(frameCanvas, 0, 0);
    const top = headFillTop(tint.level, headSeam);
    const fillCtx = fillCanvas.getContext('2d');
    if (top < 1 && fillCtx) {
      const [y0, y1] = chargeGradientSpan(tint.level, headSeam, h);
      fillCtx.globalCompositeOperation = 'source-over';
      fillCtx.clearRect(0, 0, w, h);
      for (const [stops, alpha] of [
        [CHARGE_STOPS.blue, 1],
        [CHARGE_STOPS.green, tint.green],
      ] as const) {
        const gradient = fillCtx.createLinearGradient(0, y0, 0, y1);
        for (const [offset, color] of stops) gradient.addColorStop(offset, color);
        fillCtx.globalAlpha = alpha;
        fillCtx.fillStyle = gradient;
        fillCtx.fillRect(0, top * h, w, h - top * h);
      }
      fillCtx.globalAlpha = 1;
      fillCtx.globalCompositeOperation = 'destination-in';
      fillCtx.drawImage(shareCanvas, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(fillCanvas, 0, 0);
    }

    ctx.save();
    tilt(ctx);
    ctx.globalCompositeOperation = 'screen';
    const [sx, sy] = eyeShift([eyes.x, eyes.y], front);
    const open = blinkOpen(now - blinkFrom);
    const r = rig.glow * w;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    for (const [offset, color] of GLOW_STOPS) glow.addColorStop(offset, color);
    const fade = [rig.turnFade[0] * h, rig.turnFade[1] * h] as const;
    for (const [ex, ey] of rig.eyes) {
      // The light glides on the visor, then rides the helmet's turn along its row.
      let x = (ex + sx) * w;
      const y = ey * h + sy * w;
      let width = eyeWidth(ex + sx, rig.visor);
      const row = Math.min(h - 1, Math.max(0, Math.round(y)));
      const middle = rows[row * 2] ?? Number.NaN;
      const half = rows[row * 2 + 1] ?? Number.NaN;
      if (!Number.isNaN(middle)) {
        const [u, narrow] = turnPoint((x - middle) / half, Math.sin(pose.yaw * turnWeight(y, fade)));
        x = middle + u * half;
        width *= narrow;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(width, open);
      ctx.fillStyle = glow;
      ctx.fillRect(-r, -r, 2 * r, 2 * r);
      ctx.restore();
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(frameCanvas, 0, 0);
    // Behind it all, the photo's own shadow, which the photo's hole for the head masks out.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(headLayers, 0, 2 * h, w, h, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Moves the head's fill toward `level` / `green` like the CSS fill (or at once, if `now`). */
  function setTint(level: number, green: number, now = false) {
    cancelAnimationFrame(tintAnim);
    if (now) {
      tint.level = level;
      tint.green = green;
      drawHead();
      return;
    }
    const from = { ...tint };
    const startedAt = performance.now();
    const step = (time: number) => {
      const t = time - startedAt;
      tint.level = from.level + (level - from.level) * easeInOut(Math.min(1, t / TIMING.travel));
      tint.green = from.green + (green - from.green) * Math.min(1, t / 600);
      drawHead(time);
      if (t < Math.max(TIMING.travel, 600)) tintAnim = requestAnimationFrame(step);
    };
    tintAnim = requestAnimationFrame(step);
  }

  /** Runs the eye and helmet springs toward `target` (and any blink) until everything settles. */
  function animateHead() {
    if (!headLayers || headAnim) return;
    let last = performance.now();
    const step = (now: number) => {
      // Small sub-steps keep the springs stable even after a long (throttled) frame.
      let dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      while (dt > 0) {
        const s = Math.min(dt, 1 / 120);
        [eyes.x, eyes.vx] = springStep(eyes.x, eyes.vx, target[0], s, EYE_OMEGA);
        [eyes.y, eyes.vy] = springStep(eyes.y, eyes.vy, target[1], s, EYE_OMEGA);
        [helmet.x, helmet.vx] = springStep(helmet.x, helmet.vx, target[0], s);
        [helmet.y, helmet.vy] = springStep(helmet.y, helmet.vy, target[1], s);
        dt -= s;
      }
      const settled = [eyes, helmet].every(
        (p) =>
          Math.abs(p.x - target[0]) < 1e-3 &&
          Math.abs(p.y - target[1]) < 1e-3 &&
          Math.abs(p.vx) < 1e-3 &&
          Math.abs(p.vy) < 1e-3,
      );
      if (settled) for (const p of [eyes, helmet]) Object.assign(p, { x: target[0], y: target[1], vx: 0, vy: 0 });
      drawHead(now);
      headAnim = settled && now - blinkFrom >= BLINK_MS ? 0 : requestAnimationFrame(step);
    };
    headAnim = requestAnimationFrame(step);
  }

  /**
   * Attends to participant `id`, or faces the visitor (`front`): the eyes glide there and the helmet
   * follows (see HEAD_TURN_MS).
   */
  function lookAt(id: string) {
    const next = rig?.gaze[id] ?? front;
    // Crossing to the other side of the stage: a blink as the eyes set off.
    if (headLayers && next[0] * target[0] < 0) blinkFrom = performance.now();
    target = next;
    flow.dataset['head'] = rig?.gaze[id] ? id : 'front';
    animateHead();
  }

  /** Loads the head layers (after the page has loaded), then hands the head over to the canvas. */
  async function loadHead() {
    if (headLayers || !headCanvas || !headUrl || !rig) return;
    const img = new Image();
    img.src = headUrl;
    try {
      await img.decode();
    } catch {
      return;
    }
    headCanvas.width = img.naturalWidth;
    headCanvas.height = Math.floor(img.naturalHeight / 3);
    frameCanvas.width = headCanvas.width;
    frameCanvas.height = headCanvas.height;
    fillCanvas.width = shareCanvas.width = turnCanvas.width = headCanvas.width;
    fillCanvas.height = shareCanvas.height = turnCanvas.height = headCanvas.height;
    const turnCtx = turnCanvas.getContext('2d');
    if (turnCtx) {
      const { width: w, height: h } = turnCanvas;
      turnCtx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
      helmetPixels = turnCtx.getImageData(0, 0, w, h);
      turned = turnCtx.createImageData(w, h);
      const data = helmetPixels.data;
      rows = helmetRows((i) => data[i * 4 + 3] ?? 0, w, h);
    }
    const shareCtx = shareCanvas.getContext('2d');
    if (shareCtx) {
      const { width: w, height: h } = shareCanvas;
      const share = shareCtx.createImageData(w, h);
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          share.data[(y * w + x) * 4 + 3] = Math.round(
            255 * headChargeShare(x + 0.5, y + 0.5, w, h, rig.chargeFeather * w),
          );
        }
      }
      shareCtx.putImageData(share, 0, 0);
    }
    headLayers = img;
    drawHead();
    flow.setAttribute('data-head-live', '');
    animateHead();
  }

  /** Waits `ms`, then keeps waiting while paused; resolves false if a newer run started. */
  async function wait(ms: number, id: number): Promise<boolean> {
    await new Promise((r) => setTimeout(r, ms));
    while (hero.hasAttribute('data-paused') || hero.hasAttribute('data-intro')) {
      if (id !== run) return false;
      await new Promise((r) => setTimeout(r, 200));
    }
    return id === run;
  }

  const approved = () => (flow.hasAttribute('data-approved') ? 1 : 0);
  const setLevel = (done: number, now = false) => {
    const level = levelFor(done, hops.length);
    flow.style.setProperty('--level', String(level));
    setTint(level, approved(), now);
  };

  function activate(nodeId: string) {
    for (const [id, node] of nodes) node.classList.toggle('is-active', id === nodeId);
    nodes.get(nodeId)?.classList.add('is-visited');
  }

  /** Puts the token at the start of a spoke without animating, ready to travel. */
  function placeOn(hop: HopData) {
    const spoke = spokes.get(hop.spoke);
    const path = hop.direction === 'out' ? spoke?.dataset['out'] : spoke?.dataset['back'];
    token.classList.add('is-jumping');
    token.style.offsetPath = `path('${path ?? ''}')`;
    token.style.offsetDistance = '0%';
    void token.offsetWidth;
    token.classList.remove('is-jumping');
  }

  function reset() {
    flow.setAttribute('data-resetting', '');
    for (const node of nodes.values()) node.classList.remove('is-visited', 'is-active');
    for (const spoke of spokes.values()) spoke.classList.remove('is-drawn', 'is-active');
    label.textContent = '';
    flow.removeAttribute('data-approved');
    lookAt('front');
    setLevel(0, true);
    void flow.offsetWidth;
    flow.removeAttribute('data-resetting');
  }

  /**
   * Shows the charge fill (hidden until needed, so its mask is not fetched). With the head live on
   * its canvas the body-only mask applies (CSS); otherwise the whole robot's, fetched only now.
   */
  function showCharge() {
    if (!headLayers) flow.setAttribute('data-charge-full', '');
  }

  async function play() {
    run += 1;
    const id = run;
    flow.setAttribute('data-live', '');
    void loadHead();
    for (;;) {
      reset();
      const first = hops[0];
      if (first) {
        placeOn(first);
        activate(first.direction === 'out' ? 'agent' : first.spoke);
      }
      if (!(await wait(TIMING.start, id))) return;
      showCharge();
      for (const [i, hop] of hops.entries()) {
        placeOn(hop);
        lookAt(hop.spoke);
        label.textContent = hop.label;
        for (const [sid, spoke] of spokes) spoke.classList.toggle('is-active', sid === hop.spoke);
        spokes.get(hop.spoke)?.classList.add('is-drawn');
        token.style.offsetDistance = '100%';
        if (!(await wait(TIMING.travel, id))) return;
        activate(hop.to);
        if (hop.approves) flow.setAttribute('data-approved', '');
        setLevel(i + 1);
        if (!(await wait(TIMING.dwell, id))) return;
      }
      label.textContent = '';
      for (const spoke of spokes.values()) spoke.classList.remove('is-active');
      flow.setAttribute('data-complete', '');
      lookAt('front');
      if (!(await wait(TIMING.hold, id))) return;
      flow.removeAttribute('data-complete');
    }
  }

  function showComplete() {
    run += 1;
    flow.removeAttribute('data-live');
    cancelAnimationFrame(headAnim);
    headAnim = 0;
    target = front;
    blinkFrom = -Infinity;
    flow.dataset['head'] = 'front';
    for (const p of [eyes, helmet]) Object.assign(p, { x: front[0], y: front[1], vx: 0, vy: 0 });
    drawHead();
    flow.setAttribute('data-approved', '');
    flow.style.setProperty('--level', '1');
    setTint(1, 1, true);
    showCharge();
  }

  const start = () => (reduceMotion.matches ? showComplete() : void play());
  whenIdle(start);
  reduceMotion.addEventListener('change', start);
  hero.querySelector<HTMLButtonElement>('[data-hero-replay]')?.addEventListener('click', start);
}
