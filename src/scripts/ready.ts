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
