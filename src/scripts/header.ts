import { createMenu } from './menu';
import { initScrollSpy } from './scroll-spy';

const DESKTOP = '(width >= 64rem)';

export function initHeader(root: Document = document): void {
  const header = root.querySelector<HTMLElement>('[data-site-header]');
  if (!header) return;

  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = header.querySelector<HTMLElement>('[data-mobile-menu]');
  if (toggle && panel) {
    const menu = createMenu({
      toggle,
      panel,
      label: header.querySelector<HTMLElement>('[data-menu-label]'),
      background: [...root.querySelectorAll<HTMLElement>('main, body > footer, .skip-link')],
    });
    // Leaving the mobile layout (rotation, resize) must never strand an open menu.
    window.matchMedia(DESKTOP).addEventListener('change', (event) => {
      if (event.matches) menu.close({ restoreFocus: false });
    });
  }

  // Home page: reveal the compact header once the hero (and its own nav) scrolls away.
  const hero = root.querySelector<HTMLElement>('[data-hero]');
  if (header.dataset['mode'] === 'home' && hero) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) header.removeAttribute('data-visible');
        else header.setAttribute('data-visible', '');
      },
      { rootMargin: '-120px 0px 0px 0px' },
    );
    observer.observe(hero);
  }

  initScrollSpy(root);
}
