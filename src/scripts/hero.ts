import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/** Timing of the agent loop (ms). The token's travel time matches --step-travel in CSS. */
export const TIMING = { travel: 1000, dwell: 550, start: 500, hold: 2600 } as const;

/** A full left-to-right head turn (every frame) takes this long, in ms (owner: a slow turn). */
export const HEAD_SWEEP_MS = 1500;

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
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
  let headSprite: HTMLImageElement | undefined;
  let headPos = headDefault;
  let headTarget = headDefault;
  let headAnim = 0;

  /** Draws head frame `pos`, blending into the next frame for fractional positions. */
  function drawHead(pos: number) {
    const ctx = headCanvas?.getContext('2d');
    if (!headCanvas || !ctx || !headSprite) return;
    const { width: w, height: h } = headCanvas;
    const a = Math.floor(pos);
    const f = pos - a;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(headSprite, 0, a * h, w, h, 0, 0, w, h);
    if (f > 0.01 && a + 1 < headFrames) {
      ctx.globalAlpha = f;
      ctx.drawImage(headSprite, 0, (a + 1) * h, w, h, 0, 0, w, h);
    }
  }

  /** Turns the head to `frame`, at a steady speed (HEAD_SWEEP_MS for the full range), eased. */
  function lookAt(frame: number) {
    headTarget = frame;
    flow.dataset['head'] = String(frame);
    if (!headSprite) return;
    cancelAnimationFrame(headAnim);
    const from = headPos;
    const duration = (Math.abs(frame - from) / Math.max(1, headFrames - 1)) * HEAD_SWEEP_MS;
    if (duration < 1) return;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      headPos = from + (frame - from) * easeInOut(t);
      drawHead(headPos);
      if (t < 1) headAnim = requestAnimationFrame(step);
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

  const setLevel = (done: number) => flow.style.setProperty('--level', String(levelFor(done, hops.length)));

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
    setLevel(0);
    void flow.offsetWidth;
    flow.removeAttribute('data-resetting');
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
      for (const [i, hop] of hops.entries()) {
        placeOn(hop);
        lookAt(hop.look ?? headDefault);
        label.textContent = hop.label;
        for (const [sid, spoke] of spokes) spoke.classList.toggle('is-active', sid === hop.spoke);
        spokes.get(hop.spoke)?.classList.add('is-drawn');
        token.style.offsetDistance = '100%';
        if (!(await wait(TIMING.travel, id))) return;
        activate(hop.to);
        setLevel(i + 1);
        if (hop.approves) flow.setAttribute('data-approved', '');
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
    headPos = headDefault;
    headTarget = headDefault;
    drawHead(headPos);
    flow.setAttribute('data-approved', '');
    flow.style.setProperty('--level', '1');
  }

  const start = () => (reduceMotion.matches ? showComplete() : void play());
  whenIdle(start);
  reduceMotion.addEventListener('change', start);
  hero.querySelector<HTMLButtonElement>('[data-hero-replay]')?.addEventListener('click', start);
}
