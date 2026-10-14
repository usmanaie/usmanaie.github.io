/** How close (px) deferred media must come to the viewport to load: Chrome's lazy-load distance on 4G. */
export const DEFER_MARGIN = '1250px';

/**
 * Loads decorative media held in `<noscript data-defer>` only once it nears the viewport.
 *
 * Native `loading="lazy"` starts far earlier than it needs to (Chrome loads lazy images up to
 * ~5000px away when it cannot estimate the connection, as in Lighthouse), so below-the-fold art
 * still costs the first visit. Without JS the noscript renders its markup as usual (lazy images);
 * with JS its text is the same markup, parsed and put in its place when its parent comes within
 * `rootMargin` of the viewport. The parent is observed because a noscript is never laid out.
 */
export function loadWhenNear(root: ParentNode = document, rootMargin = DEFER_MARGIN): void {
  const holders = new Map<Element, HTMLElement>();
  for (const holder of root.querySelectorAll<HTMLElement>('noscript[data-defer]')) {
    if (holder.parentElement) holders.set(holder.parentElement, holder);
  }
  if (holders.size === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const holder = holders.get(entry.target);
        if (!entry.isIntersecting || !holder) continue;
        observer.unobserve(entry.target);
        const template = document.createElement('template');
        template.innerHTML = holder.textContent;
        holder.replaceWith(template.content);
      }
    },
    { rootMargin },
  );
  for (const parent of holders.keys()) observer.observe(parent);
}
