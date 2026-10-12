/**
 * Reviews carousel enhancement. The track is a native horizontal scroller with
 * scroll-snap, so touch, trackpad, keyboard and no-JS all work; this script only wires
 * the prev/next buttons, their disabled state, and a polite live status. No auto-rotation.
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
  const slideWidth = () => slides[0]?.getBoundingClientRect().width ?? track.clientWidth;

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
    if (status && state.current !== lastAnnounced) {
      status.textContent = `Showing review ${state.current} of ${slides.length}`;
      lastAnnounced = state.current;
    }
  };

  const go = (direction: 1 | -1, button: HTMLButtonElement) => {
    if (button.getAttribute('aria-disabled') === 'true') return;
    track.scrollBy({
      left: stepDistance(slideWidth(), direction),
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
  update();

  return () => {
    prev.removeEventListener('click', onPrev);
    next.removeEventListener('click', onNext);
    track.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  };
}
