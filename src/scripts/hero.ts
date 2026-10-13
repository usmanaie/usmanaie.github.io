import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/** Timing of the agent loop (ms). The token's travel time matches --step-travel in CSS. */
export const TIMING = { travel: 1100, dwell: 950, hold: 2600, reveal: 500 } as const;

/** Robot energy level (0-1) once `visited` of `total` steps are done. */
export function levelFor(visited: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, visited / total)) : 0;
}

/**
 * Hero agent-flow controller.
 *  - Static HTML shows the completed flow (no-JS, reduced motion, first paint for LCP).
 *  - Once the page is idle, the loop plays: the agent token travels the path step by step;
 *    each step reveals its bubble, draws the connector behind the token and raises the
 *    robot's energy level. After RESPONSE the token returns to USER, holds, and repeats.
 *  - Pauses while the hero is off-screen or the tab is hidden; the robot replays from step 1.
 */
export function initHero(root: Document = document): void {
  const heroEl = root.querySelector<HTMLElement>('[data-hero]');
  const flowEl = heroEl?.querySelector<HTMLElement>('[data-flow]');
  if (!heroEl || !flowEl) return;
  const hero: HTMLElement = heroEl;
  const flow: HTMLElement = flowEl;

  observeVisibility(hero);
  whenIdle(() => hero.removeAttribute('data-intro'));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const token = flow.querySelector<HTMLElement>('[data-flow-token]');
  const nodes = [...flow.querySelectorAll<SVGGElement>('[data-flow-node]')];
  const segments = [...flow.querySelectorAll<SVGGElement>('[data-flow-seg]')];
  const stops = (flow.dataset['stops'] ?? '').split(',').map(Number);
  if (!token || nodes.length === 0 || stops.length !== nodes.length) return;

  token.style.offsetPath = `path('${flow.dataset['path'] ?? ''}')`;

  let run = 0;

  /** Waits `ms`, then keeps waiting while paused; resolves false if a newer run started. */
  async function wait(ms: number, id: number): Promise<boolean> {
    await new Promise((r) => setTimeout(r, ms));
    while (hero.hasAttribute('data-paused') || hero.hasAttribute('data-intro')) {
      if (id !== run) return false;
      await new Promise((r) => setTimeout(r, 200));
    }
    return id === run;
  }

  const setLevel = (visited: number) => flow.style.setProperty('--level', String(levelFor(visited, nodes.length)));
  const moveToken = (distance: number) => {
    if (token) token.style.offsetDistance = `${distance}%`;
  };

  function visit(index: number) {
    nodes.forEach((node, i) => {
      node.classList.toggle('is-visited', i <= index);
      node.classList.toggle('is-active', i === index);
    });
    setLevel(index + 1);
  }

  function reset() {
    flow.setAttribute('data-resetting', '');
    for (const node of nodes) node.classList.remove('is-visited', 'is-active');
    for (const seg of segments) seg.classList.remove('is-drawn');
    moveToken(0);
    setLevel(0);
    void flow.offsetWidth;
    flow.removeAttribute('data-resetting');
  }

  async function play() {
    run += 1;
    const id = run;
    flow.setAttribute('data-live', '');
    for (;;) {
      reset();
      if (!(await wait(TIMING.reveal, id))) return;
      visit(0);
      for (let i = 1; i < nodes.length; i += 1) {
        if (!(await wait(TIMING.dwell, id))) return;
        segments[i - 1]?.classList.add('is-drawn');
        moveToken(stops[i] ?? 0);
        if (!(await wait(TIMING.travel, id))) return;
        visit(i);
      }
      // RESPONSE travels back to the USER: the loop is complete.
      if (!(await wait(TIMING.dwell, id))) return;
      segments[nodes.length - 1]?.classList.add('is-drawn');
      moveToken(100);
      if (!(await wait(TIMING.travel, id))) return;
      nodes.forEach((node) => node.classList.remove('is-active'));
      flow.setAttribute('data-complete', '');
      if (!(await wait(TIMING.hold, id))) return;
      flow.removeAttribute('data-complete');
    }
  }

  function showComplete() {
    run += 1;
    flow.removeAttribute('data-live');
    flow.style.setProperty('--level', '1');
  }

  const start = () => (reduceMotion.matches ? showComplete() : void play());
  whenIdle(start);
  reduceMotion.addEventListener('change', start);
  hero.querySelector<HTMLButtonElement>('[data-hero-replay]')?.addEventListener('click', start);
}
