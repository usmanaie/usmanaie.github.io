import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/** Timing of the agent loop (ms). The token's travel time matches --step-travel in CSS. */
export const TIMING = { travel: 1000, dwell: 550, start: 500, hold: 2600 } as const;

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

export interface PoseSources {
  avif: string;
  webp: string;
  src: string;
}

export function parsePoses(json: string | undefined): Record<string, PoseSources> {
  if (!json) return {};
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, PoseSources>) : {};
  } catch {
    return {};
  }
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
 *  - The robot turns to whichever participant it is talking to: pose images load on first
 *    play and crossfade in; a pose that has not loaded yet is skipped (the base pose stays).
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

  const posesEl = flow.querySelector<HTMLElement>('[data-poses]');
  const charge = flow.querySelector<HTMLElement>('[data-flow-charge]');
  const baseLayer = flow.querySelector<HTMLElement>('[data-pose-layer="agent"]');
  /** Pose layers that have loaded and decoded, by participant id. */
  const poseLayers = new Map<string, HTMLImageElement>();
  let posesRequested = false;

  /** Builds each pose's <picture> (AVIF, WebP fallback) and keeps it once decoded. */
  function loadPoses() {
    if (posesRequested || !posesEl) return;
    posesRequested = true;
    const sizes = posesEl.dataset['poseSizes'] ?? '';
    for (const [id, sources] of Object.entries(parsePoses(posesEl.dataset['poses']))) {
      const picture = document.createElement('picture');
      for (const [type, srcset] of [
        ['image/avif', sources.avif],
        ['image/webp', sources.webp],
      ] as const) {
        const source = document.createElement('source');
        source.type = type;
        source.srcset = srcset;
        source.sizes = sizes;
        picture.append(source);
      }
      const img = document.createElement('img');
      img.className = 'flow__layer';
      img.dataset['poseLayer'] = id;
      img.alt = '';
      img.decoding = 'async';
      img.sizes = sizes;
      img.src = sources.src;
      picture.append(img);
      posesEl.insertBefore(picture, charge);
      img
        .decode()
        .then(() => poseLayers.set(id, img))
        .catch(() => picture.remove());
    }
  }

  /** Shows the robot facing `id` (or the base pose), fading the new pose in on top. */
  function showPose(id: string) {
    const pose = poseLayers.get(id);
    const shown: HTMLElement | null = pose ?? baseLayer;
    for (const layer of flow.querySelectorAll<HTMLElement>('[data-pose-layer]')) {
      layer.classList.toggle('is-shown', layer === shown);
    }
    flow.dataset['pose'] = pose ? id : 'agent';
    // The charge follows the silhouette: the pose image's own alpha, or the base mask (CSS).
    if (charge) charge.style.maskImage = pose ? `url("${pose.currentSrc}")` : '';
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
    showPose('agent');
    setLevel(0);
    void flow.offsetWidth;
    flow.removeAttribute('data-resetting');
  }

  async function play() {
    run += 1;
    const id = run;
    flow.setAttribute('data-live', '');
    loadPoses();
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
        showPose(hop.spoke);
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
      showPose('agent');
      flow.setAttribute('data-complete', '');
      if (!(await wait(TIMING.hold, id))) return;
      flow.removeAttribute('data-complete');
    }
  }

  function showComplete() {
    run += 1;
    flow.removeAttribute('data-live');
    showPose('agent');
    flow.setAttribute('data-approved', '');
    flow.style.setProperty('--level', '1');
  }

  const start = () => (reduceMotion.matches ? showComplete() : void play());
  whenIdle(start);
  reduceMotion.addEventListener('change', start);
  hero.querySelector<HTMLButtonElement>('[data-hero-replay]')?.addEventListener('click', start);
}
