import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/** Timing of the agent loop (ms). The token's travel time matches --step-travel in CSS. */
export const TIMING = { travel: 1000, dwell: 550, start: 500, hold: 2600 } as const;

/**
 * The head moves like a critically damped spring: it eases in and out, never overshoots, and a
 * new turn that interrupts one in progress carries on smoothly instead of stopping and
 * restarting. Any turn settles (95%) in about this long, in ms (owner: a slow, smooth turn).
 */
export const HEAD_TURN_MS = 2200;
/** The eye lights lead the head: the same spring, settling in this long (ms). */
export const EYE_GLIDE_MS = 1000;
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
 * How much attention moves the head, per unit of gaze change from the rest pose (the photo's own,
 * facing the USER; a full swing to the LLM is ~1.9 units): the eye lights glide across the visor
 * (head-box widths), the helmet tilts about the neck joint (degrees, clockwise) and shifts a little
 * (head-box widths). Subtle on purpose: the helmet moves 2-5 px at the page's scale.
 */
export const POSE = { eyeX: 0.069, eyeY: 0.062, tilt: 1.33, shiftX: 0.0063, shiftY: 0.0158 } as const;

/** The helmet's tilt (radians, clockwise) and shift (head-box widths) while attending to `gaze`. */
export function headPose(gaze: Gaze, rest: Gaze): { angle: number; dx: number; dy: number } {
  const gx = gaze[0] - rest[0];
  const gy = gaze[1] - rest[1];
  return { angle: (gx * POSE.tilt * Math.PI) / 180, dx: gx * POSE.shiftX, dy: gy * POSE.shiftY };
}

/** How far the eye lights have glided from their place in the photo (head-box widths). */
export function eyeShift(gaze: Gaze, rest: Gaze): [number, number] {
  return [(gaze[0] - rest[0]) * POSE.eyeX, (gaze[1] - rest[1]) * POSE.eyeY];
}

/** A blink (the eye lights dim and narrow, then open) as the robot turns to the other side. */
export const BLINK_MS = 300;

/** The eye lights' height `t` ms into a blink (1 = open): one smooth dip, never a jump. */
export function blinkOpen(t: number): number {
  if (t <= 0 || t >= BLINK_MS) return 1;
  return 1 - (0.85 * (1 - Math.cos((2 * Math.PI * t) / BLINK_MS))) / 2;
}

/**
 * The eye lights' glow, measured from the photo's two lights ([offset, r, g, b, alpha] stops of a
 * radial gradient drawn with 'screen'): the left one is narrow and whitish (it sits on the visor's
 * reflection, seen at an angle), the right one round and blue. A light takes on the right one's look
 * as it glides off the reflection.
 */
const GLOW_NARROW = [
  [0, 255, 245, 234, 0.5],
  [0.094, 255, 241, 254, 0.48],
  [0.188, 255, 241, 245, 0.414],
  [0.25, 234, 232, 255, 0.392],
  [0.312, 197, 211, 255, 0.392],
  [0.375, 185, 207, 255, 0.352],
  [0.438, 179, 208, 255, 0.261],
  [0.531, 156, 200, 255, 0.174],
  [0.625, 130, 187, 255, 0.137],
  [0.75, 100, 160, 255, 0.113],
  [0.875, 83, 159, 255, 0.061],
  [1, 80, 144, 255, 0],
] as const;
const GLOW_ROUND = [
  [0, 147, 215, 255, 0.765],
  [0.094, 148, 216, 255, 0.751],
  [0.188, 147, 215, 255, 0.732],
  [0.25, 144, 213, 255, 0.691],
  [0.312, 132, 203, 255, 0.553],
  [0.375, 114, 180, 255, 0.362],
  [0.438, 110, 169, 255, 0.268],
  [0.531, 105, 162, 255, 0.189],
  [0.625, 100, 155, 255, 0.128],
  [0.75, 92, 141, 255, 0.07],
  [0.875, 74, 133, 255, 0.036],
  [1, 56, 114, 255, 0],
] as const;
/** The narrow light's width and height relative to the round one's. */
const NARROW = [0.6, 0.95] as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 where the visor shows a light at an angle (`from`), 1 from `to` rightward, eased between. */
export function roundness(x: number, from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** The glow's gradient stops for a light of the given roundness (0 narrow, 1 round). */
export function glowStops(round: number): [number, string][] {
  return GLOW_NARROW.map((narrow, i) => {
    const wide = GLOW_ROUND[i] ?? narrow;
    const [offset, r, g, b, a] = narrow.map((v, c) => lerp(v, wide[c] ?? v, round));
    return [
      offset ?? 0,
      `rgb(${Math.round(r ?? 0)} ${Math.round(g ?? 0)} ${Math.round(b ?? 0)} / ${(a ?? 0).toFixed(3)})`,
    ];
  });
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

/** Fill colour on the head: the charge's blue, turning to its green once approved (0-1). */
export function headTintColor(green: number): string {
  const mix = (a: number, b: number) => a + (b - a) * green;
  return `rgb(${mix(130, 120)} ${mix(210, 240)} ${mix(255, 170)} / ${mix(0.55, 0.6)})`;
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
  /** The visor span (box fractions) across which a light goes from narrow to round. */
  foreshortened: [number, number];
  gaze: Record<string, Gaze>;
  /** The participant the photo's head faces. */
  rest: string;
}

export function parseRig(json: string | undefined): HeadRig | undefined {
  if (!json) return undefined;
  try {
    const rig = JSON.parse(json) as Partial<HeadRig>;
    const ok =
      Array.isArray(rig.pivot) &&
      Array.isArray(rig.eyes) &&
      typeof rig.glow === 'number' &&
      Array.isArray(rig.foreshortened) &&
      typeof rig.gaze === 'object' &&
      rig.gaze !== null &&
      typeof rig.rest === 'string' &&
      rig.rest in rig.gaze;
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
 *    canvas over the head (two layers cut from the photo, loaded on first play) its eye lights
 *    glide across the visor and the helmet tilts a few degrees, both on springs.
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
  const rest: Gaze = rig?.gaze[rig.rest] ?? [0, 0];
  const frameCanvas = document.createElement('canvas');
  let headLayers: HTMLImageElement | undefined;
  /** Where the robot attends, and the eye lights' and the helmet's springs toward it. */
  let target: Gaze = rest;
  const eyes = { x: rest[0], y: rest[1], vx: 0, vy: 0 };
  const helmet = { x: rest[0], y: rest[1], vx: 0, vy: 0 };
  let blinkFrom = -Infinity;
  let headAnim = 0;
  /** The charge fill on the head, mirroring the CSS fill on the body (level 0-1, green 0-1). */
  const tint = { level: 0, green: 0 };
  let tintAnim = 0;

  /**
   * Draws the head: the still neck plate, the helmet tilted toward the participant, the charge fill
   * where it has risen into the head (multiplied like the body's), then the eye lights (they glow
   * over the fill), all kept to the head's own silhouette.
   */
  function drawHead(now = performance.now()) {
    const ctx = headCanvas?.getContext('2d');
    const frameCtx = frameCanvas.getContext('2d');
    if (!headCanvas || !ctx || !frameCtx || !headLayers || !rig) return;
    const { width: w, height: h } = headCanvas;
    const pose = headPose([helmet.x, helmet.y], rest);
    const px = rig.pivot[0] * w;
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
    frameCtx.drawImage(headLayers, 0, 0, w, h, 0, 0, w, h);
    frameCtx.restore();

    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(frameCanvas, 0, 0);
    const top = headFillTop(tint.level, headSeam);
    if (top < 1) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = headTintColor(tint.green);
      ctx.fillRect(0, top * h, w, h - top * h);
    }

    ctx.save();
    tilt(ctx);
    ctx.globalCompositeOperation = 'screen';
    const [sx, sy] = eyeShift([eyes.x, eyes.y], rest);
    const open = blinkOpen(now - blinkFrom);
    const r = rig.glow * w;
    for (const [ex, ey] of rig.eyes) {
      const round = roundness(ex + sx, rig.foreshortened[0], rig.foreshortened[1]);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      for (const [offset, color] of glowStops(round)) glow.addColorStop(offset, color);
      ctx.save();
      ctx.translate((ex + sx) * w, ey * h + sy * w);
      ctx.scale(lerp(NARROW[0], 1, round), lerp(NARROW[1], 1, round) * open);
      ctx.fillStyle = glow;
      ctx.fillRect(-r, -r, 2 * r, 2 * r);
      ctx.restore();
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(frameCanvas, 0, 0);
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

  /** Attends to participant `id`: the eyes glide there and the helmet follows (see HEAD_TURN_MS). */
  function lookAt(id: string) {
    const next = rig?.gaze[id] ?? rest;
    // Turning to the other side of the stage: a blink as the eyes set off.
    if (headLayers && Math.sign(next[0]) !== Math.sign(target[0])) blinkFrom = performance.now();
    target = next;
    flow.dataset['head'] = id;
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
    headCanvas.height = Math.floor(img.naturalHeight / 2);
    frameCanvas.width = headCanvas.width;
    frameCanvas.height = headCanvas.height;
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
    lookAt(rig?.rest ?? '');
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
      if (!(await wait(TIMING.hold, id))) return;
      flow.removeAttribute('data-complete');
    }
  }

  function showComplete() {
    run += 1;
    flow.removeAttribute('data-live');
    cancelAnimationFrame(headAnim);
    headAnim = 0;
    target = rest;
    blinkFrom = -Infinity;
    for (const p of [eyes, helmet]) Object.assign(p, { x: rest[0], y: rest[1], vx: 0, vy: 0 });
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
