/** Runs `callback` once the page has loaded and the main thread is idle. */
export function whenIdle(callback: () => void): void {
  const idle = () =>
    'requestIdleCallback' in window
      ? window.requestIdleCallback(callback, { timeout: 1500 })
      : setTimeout(callback, 200);
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

/** Marks the document as settled: deferred rendering optimisations switch off (see global.css). */
export function markReadyWhenIdle(): void {
  whenIdle(() => document.documentElement.setAttribute('data-ready', ''));
}

const markReady = () => {
  const root = document.documentElement;
  if (root.hasAttribute('data-ready')) return;
  root.setAttribute('data-ready', '');
  // Lay the sections out now, before the browser starts the anchor scroll: if they grew a frame
  // later, mid-scroll, scroll anchoring could cancel the smooth scroll.
  void root.offsetHeight;
};

/**
 * In-page anchors need real section sizes to land exactly, but before the page is idle the
 * sections below the fold only have estimated sizes (see global.css). So a click on an in-page
 * link marks the document ready before the browser scrolls, and arriving with a #hash marks it
 * ready and re-lands on the target.
 */
export function readyForAnchors(): void {
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href*="#"]') : null;
      if (link instanceof HTMLAnchorElement && link.hash && link.pathname === location.pathname) markReady();
    },
    { capture: true },
  );
  if (location.hash.length > 1) {
    markReady();
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' });
  }
}
