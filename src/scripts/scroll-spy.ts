/**
 * Scroll-spy: marks the nav links for the section currently in view with
 * aria-current="location". Never touches location.hash, so scrolling does not
 * pollute history or break the back button.
 */

/** Picks the active section: the visible one nearest the top of the reading band. */
export function pickActive(visible: ReadonlyMap<string, number>, order: readonly string[]): string | null {
  let best: string | null = null;
  let bestTop = Number.POSITIVE_INFINITY;
  for (const id of order) {
    const top = visible.get(id);
    if (top === undefined) continue;
    if (top < bestTop) {
      best = id;
      bestTop = top;
    }
  }
  return best;
}

export function setCurrent(links: Iterable<HTMLAnchorElement>, activeId: string | null): void {
  for (const link of links) {
    if (link.dataset['spyLink'] === activeId) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

export function initScrollSpy(root: Document = document): () => void {
  const links = [...root.querySelectorAll<HTMLAnchorElement>('a[data-spy-link]')];
  const ids = [...new Set(links.map((link) => link.dataset['spyLink'] ?? ''))];
  const sections = ids.map((id) => root.getElementById(id)).filter((el): el is HTMLElement => el !== null);
  if (sections.length === 0) return () => undefined;

  const order = sections.map((section) => section.id);
  const visible = new Map<string, number>();

  // A thin "reading band" ~35-45% down the viewport decides which section is current.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
        else visible.delete(entry.target.id);
      }
      setCurrent(links, pickActive(visible, order) ?? order[0] ?? null);
    },
    { rootMargin: '-35% 0px -55% 0px' },
  );
  for (const section of sections) observer.observe(section);
  return () => observer.disconnect();
}
