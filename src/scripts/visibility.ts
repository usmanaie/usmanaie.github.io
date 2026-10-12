/**
 * Sets `data-paused` on an animated region while it is off-screen or the page is hidden,
 * so its CSS animations stop consuming frames. Returns a cleanup function.
 */
export function observeVisibility(target: HTMLElement, rootMargin = '0px'): () => void {
  let onScreen = true;

  const apply = () => {
    if (onScreen && document.visibilityState === 'visible') target.removeAttribute('data-paused');
    else target.setAttribute('data-paused', '');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) onScreen = entry.isIntersecting;
      apply();
    },
    { rootMargin },
  );
  observer.observe(target);
  document.addEventListener('visibilitychange', apply);

  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', apply);
  };
}
