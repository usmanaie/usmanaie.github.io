/**
 * Accessible disclosure menu: aria-expanded/aria-controls, focus trap while open,
 * Escape to close, closes on link click, and background scroll lock without layout
 * shift (the scrollbar width is compensated).
 */

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface MenuElements {
  toggle: HTMLButtonElement;
  panel: HTMLElement;
  label?: HTMLElement | null;
  /** Regions made inert while the menu is open. */
  background: HTMLElement[];
}

/** Next element to focus when Tab is pressed inside the trap, or null to let the browser move focus. */
export function nextTrapTarget(
  focusables: readonly HTMLElement[],
  active: Element | null,
  backwards: boolean,
): HTMLElement | null {
  if (focusables.length === 0) return null;
  const first = focusables[0] ?? null;
  const last = focusables[focusables.length - 1] ?? null;
  const index = active ? focusables.indexOf(active as HTMLElement) : -1;
  if (index === -1) return backwards ? last : first;
  if (backwards && index === 0) return last;
  if (!backwards && index === focusables.length - 1) return first;
  return null;
}

export function createMenu({ toggle, panel, label, background }: MenuElements) {
  const doc = toggle.ownerDocument;
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const focusables = () => [toggle, ...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];

  function lockScroll(lock: boolean) {
    const body = doc.body;
    if (lock) {
      const scrollbar = doc.defaultView ? doc.defaultView.innerWidth - doc.documentElement.clientWidth : 0;
      body.style.setProperty('--scrollbar-compensation', `${scrollbar}px`);
      body.classList.add('is-scroll-locked');
    } else {
      body.classList.remove('is-scroll-locked');
      body.style.removeProperty('--scrollbar-compensation');
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      const target = nextTrapTarget(focusables(), doc.activeElement, event.shiftKey);
      if (target) {
        event.preventDefault();
        target.focus();
      }
    }
  }

  function open() {
    toggle.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Close menu';
    panel.hidden = false;
    for (const region of background) region.inert = true;
    lockScroll(true);
    doc.addEventListener('keydown', onKeydown);
    panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    toggle.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Open menu';
    panel.hidden = true;
    for (const region of background) region.inert = false;
    lockScroll(false);
    doc.removeEventListener('keydown', onKeydown);
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));
  panel.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest('a')) close({ restoreFocus: false });
  });

  return { open, close, isOpen };
}
