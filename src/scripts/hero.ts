import { whenIdle } from './ready';
import { observeVisibility } from './visibility';

/**
 * Hero animation controller.
 *  - Starts the cycle only once the page has loaded and the main thread is idle, so the
 *    animations never delay the first render (they begin from 0%, as if just loaded).
 *  - Pauses every animation while the hero is off-screen or the tab is hidden.
 *  - The replay button restarts the 11s agent cycle from the beginning.
 */
export function initHero(root: Document = document): void {
  const hero = root.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  observeVisibility(hero);
  whenIdle(() => hero.removeAttribute('data-intro'));

  const replay = hero.querySelector<HTMLButtonElement>('[data-hero-replay]');
  replay?.addEventListener('click', () => {
    hero.setAttribute('data-resetting', '');
    // Force a style flush so removing the attribute restarts the animations from 0%.
    void hero.offsetWidth;
    requestAnimationFrame(() => hero.removeAttribute('data-resetting'));
  });
}
