/**
 * Carousel enhancement (Reviews, completion badges). The track is a native horizontal scroller
 * with scroll-snap, so touch, trackpad, keyboard and no-JS all work; this script only wires the
 * prev/next buttons, their disabled state and a polite live status, and exposes the scroll
 * position for styling: --carousel-progress (0-1), --carousel-thumb (visible share, 0-1) and
 * data-at-start / data-at-end on the root. No auto-rotation.
 *
 * Options on the root: data-carousel-label (the noun announced, default "review") and
 * data-carousel-step="page" to move a whole view per click instead of one slide.
 */

export interface CarouselState {
  atStart: boolean;
  atEnd: boolean;
  /** 1-based index of the first fully visible slide. */
  current: number;
}

/** Derives button/status state from scroll metrics (tolerates sub-pixel rounding). */
export function computeState(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  slideWidth: number,
  total: number,
): CarouselState {
  const max = Math.max(0, scrollWidth - clientWidth);
  const atStart = scrollLeft <= 1;
  const atEnd = scrollLeft >= max - 1;
  const current = slideWidth > 0 ? Math.min(total, Math.round(scrollLeft / slideWidth) + 1) : 1;
  return { atStart, atEnd, current };
}

/** Distance to scroll for one step (one slide), in the given direction. */
export function stepDistance(slideWidth: number, direction: 1 | -1): number {
  return slideWidth * direction;
}

export function initCarousel(root: HTMLElement): () => void {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const status = root.querySelector<HTMLElement>('[data-carousel-status]');
  if (!track || !prev || !next) return () => undefined;

  const slides = [...track.querySelectorAll<HTMLElement>('[data-carousel-slide]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const noun = root.dataset['carouselLabel'] ?? 'review';
  const byPage = root.dataset['carouselStep'] === 'page';
  /** Distance from one slide to the next (slide width plus the gap). */
  const slideWidth = () => {
    const [a, b] = slides;
    const pitch = a && b ? b.offsetLeft - a.offsetLeft : 0;
    if (pitch > 0) return pitch;
    return a?.getBoundingClientRect().width ?? track.clientWidth;
  };
  /** One slide, or as many whole slides as fit in the view. */
  const step = () => (byPage ? Math.max(1, Math.floor(track.clientWidth / slideWidth())) * slideWidth() : slideWidth());

  root.setAttribute('data-enhanced', '');

  let lastAnnounced = 0;
  const update = () => {
    const state = computeState(track.scrollLeft, track.clientWidth, track.scrollWidth, slideWidth(), slides.length);
    for (const [button, disabled] of [
      [prev, state.atStart],
      [next, state.atEnd],
    ] as const) {
      button.setAttribute('aria-disabled', String(disabled));
    }
    root.toggleAttribute('data-at-start', state.atStart);
    root.toggleAttribute('data-at-end', state.atEnd);
    const max = Math.max(1, track.scrollWidth - track.clientWidth);
    root.style.setProperty('--carousel-progress', String(Math.min(1, Math.max(0, track.scrollLeft / max))));
    root.style.setProperty('--carousel-thumb', String(Math.min(1, track.clientWidth / track.scrollWidth)));
    if (status && state.current !== lastAnnounced) {
      status.textContent = `Showing ${noun} ${state.current} of ${slides.length}`;
      lastAnnounced = state.current;
    }
  };

  const go = (direction: 1 | -1, button: HTMLButtonElement) => {
    if (button.getAttribute('aria-disabled') === 'true') return;
    track.scrollBy({
      left: stepDistance(step(), direction),
      behavior: reduceMotion.matches ? 'instant' : 'smooth',
    });
  };

  const onPrev = () => go(-1, prev);
  const onNext = () => go(1, next);
  let frame = 0;
  const onScroll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };

  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);
  track.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // Below-the-fold sections are only laid out once the page is idle (see global.css), so the
  // first measurement can be empty: re-measure whenever the track's size changes.
  const resize = 'ResizeObserver' in window ? new ResizeObserver(onScroll) : null;
  resize?.observe(track);
  update();

  return () => {
    prev.removeEventListener('click', onPrev);
    next.removeEventListener('click', onNext);
    track.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    resize?.disconnect();
  };
}
