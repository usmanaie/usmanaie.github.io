import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/** Timing of the agent loop (ms). The token's travel time matches --step-travel in CSS. */
export const TIMING = { travel: 1000, dwell: 550, start: 500, hold: 2600 } as const;

/**
 * The head turns like a critically damped spring: it eases in and out, never overshoots, and a
 * new turn that interrupts one in progress carries on smoothly instead of stopping and
 * restarting. Any turn settles (95%) in about this long, in ms (owner: a slow, smooth turn).
 */
export const HEAD_TURN_MS = 2200;
const HEAD_OMEGA = 4.74 / (HEAD_TURN_MS / 1000);

/** One step of the head spring: new position and velocity (frames, frames/s) after `dt` s. */
export function springStep(pos: number, vel: number, target: number, dt: number): [number, number] {
  const accel = -HEAD_OMEGA * HEAD_OMEGA * (pos - target) - 2 * HEAD_OMEGA * vel;
  const v = vel + accel * dt;
  return [pos + v * dt, v];
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
  /** Head frame to turn to while this hop runs (towards the participant). */
  look?: number;
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
 *  - The robot turns its head toward the participant of each hop: a sprite of head frames
 *    (loaded on first play) drawn to a canvas over the head, eased between frames.
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

  const headCanvas = flow.querySelector<HTMLCanvasElement>('[data-flow-head]');
  const headUrl = flow.dataset['headSprite'];
  const headFrames = Number(flow.dataset['headFrames'] ?? 0);
  const headDefault = Number(flow.dataset['headDefault'] ?? 0);
  const headSeam = Number(flow.dataset['headSeam'] ?? 0.2);
  const frameCanvas = document.createElement('canvas');
  let headSprite: HTMLImageElement | undefined;
  let headPos = headDefault;
  let headTarget = headDefault;
  let headVel = 0;
  let headAnim = 0;
  /** The charge fill on the head, mirroring the CSS fill on the body (level 0-1, green 0-1). */
  const tint = { level: 0, green: 0 };
  let tintAnim = 0;

  /**
   * Draws head frame `pos` (blending into the next frame for fractional positions), then the
   * charge fill where it has risen into the head: multiplied like the body's fill, and kept to
   * the head's own silhouette.
   */
  function drawHead(pos: number) {
    const ctx = headCanvas?.getContext('2d');
    const frameCtx = frameCanvas.getContext('2d');
    if (!headCanvas || !ctx || !frameCtx || !headSprite) return;
    const { width: w, height: h } = headCanvas;
    const a = Math.floor(pos);
    const f = pos - a;
    frameCtx.clearRect(0, 0, w, h);
    frameCtx.globalAlpha = 1;
    frameCtx.drawImage(headSprite, 0, a * h, w, h, 0, 0, w, h);
    if (f > 0.01 && a + 1 < headFrames) {
      frameCtx.globalAlpha = f;
      frameCtx.drawImage(headSprite, 0, (a + 1) * h, w, h, 0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(frameCanvas, 0, 0);
    const top = headFillTop(tint.level, headSeam);
    if (top < 1) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = headTintColor(tint.green);
      ctx.fillRect(0, top * h, w, h - top * h);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(frameCanvas, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Moves the head's fill toward `level` / `green` like the CSS fill (or at once, if `now`). */
  function setTint(level: number, green: number, now = false) {
    cancelAnimationFrame(tintAnim);
    if (now) {
      tint.level = level;
      tint.green = green;
      drawHead(headPos);
      return;
    }
    const from = { ...tint };
    const startedAt = performance.now();
    const step = (time: number) => {
      const t = time - startedAt;
      tint.level = from.level + (level - from.level) * easeInOut(Math.min(1, t / TIMING.travel));
      tint.green = from.green + (green - from.green) * Math.min(1, t / 600);
      drawHead(headPos);
      if (t < Math.max(TIMING.travel, 600)) tintAnim = requestAnimationFrame(step);
    };
    tintAnim = requestAnimationFrame(step);
  }

  /** Turns the head toward `frame` (see HEAD_TURN_MS); runs the spring until it settles. */
  function lookAt(frame: number) {
    headTarget = frame;
    flow.dataset['head'] = String(frame);
    if (!headSprite || headAnim) return;
    let last = performance.now();
    const step = (now: number) => {
      // Small sub-steps keep the spring stable even after a long (throttled) frame.
      let dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 120);
        [headPos, headVel] = springStep(headPos, headVel, headTarget, h);
        dt -= h;
      }
      const settled = Math.abs(headPos - headTarget) < 0.01 && Math.abs(headVel) < 0.01;
      if (settled) {
        headPos = headTarget;
        headVel = 0;
      }
      drawHead(Math.min(headFrames - 1, Math.max(0, headPos)));
      headAnim = settled ? 0 : requestAnimationFrame(step);
    };
    headAnim = requestAnimationFrame(step);
  }

  /** Loads the head sprite (after the page has loaded), then hands the head over to the canvas. */
  async function loadHead() {
    if (headSprite || !headCanvas || !headUrl || headFrames < 2) return;
    const img = new Image();
    img.src = headUrl;
    try {
      await img.decode();
    } catch {
      return;
    }
    headCanvas.width = img.naturalWidth;
    headCanvas.height = Math.floor(img.naturalHeight / headFrames);
    frameCanvas.width = headCanvas.width;
    frameCanvas.height = headCanvas.height;
    headSprite = img;
    drawHead(headPos);
    flow.setAttribute('data-head-live', '');
    lookAt(headTarget);
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
    lookAt(headDefault);
    setLevel(0, true);
    void flow.offsetWidth;
    flow.removeAttribute('data-resetting');
  }

  /**
   * Shows the charge fill (hidden until needed, so its mask is not fetched). With the head live on
   * its canvas the body-only mask applies (CSS); otherwise the whole robot's, fetched only now.
   */
  function showCharge() {
    if (!headSprite) flow.setAttribute('data-charge-full', '');
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
        lookAt(hop.look ?? headDefault);
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
    headPos = headDefault;
    headVel = 0;
    headTarget = headDefault;
    drawHead(headPos);
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
