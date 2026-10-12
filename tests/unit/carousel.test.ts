import { afterEach, describe, expect, it, vi } from 'vitest';

import { computeState, initCarousel, stepDistance } from '../../src/scripts/carousel';

describe('computeState', () => {
  const total = 5;

  it('is at the start before any scrolling', () => {
    expect(computeState(0, 1200, 1875, 375, total)).toEqual({ atStart: true, atEnd: false, current: 1 });
  });

  it('is in the middle after one step', () => {
    expect(computeState(375, 1200, 1875, 375, total)).toEqual({ atStart: false, atEnd: false, current: 2 });
  });

  it('reaches the end at max scroll, tolerating sub-pixel rounding', () => {
    expect(computeState(674.6, 1200, 1875, 375, total)).toMatchObject({ atEnd: true });
  });

  it('is both at start and end when everything fits', () => {
    expect(computeState(0, 2000, 1875, 375, total)).toMatchObject({ atStart: true, atEnd: true });
  });

  it('never reports a slide beyond the total', () => {
    expect(computeState(99_999, 1200, 1875, 375, total).current).toBe(total);
  });

  it('falls back to slide 1 when slide width is unknown', () => {
    expect(computeState(100, 1200, 1875, 0, total).current).toBe(1);
  });
});

describe('stepDistance', () => {
  it('moves one slide in either direction', () => {
    expect(stepDistance(375, 1)).toBe(375);
    expect(stepDistance(375, -1)).toBe(-375);
  });
});

describe('initCarousel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mount() {
    document.body.innerHTML = `
      <div data-carousel>
        <button data-carousel-prev></button>
        <button data-carousel-next></button>
        <div data-carousel-track>
          ${'<div data-carousel-slide></div>'.repeat(5)}
        </div>
        <p data-carousel-status></p>
      </div>`;
    const root = document.querySelector<HTMLElement>('[data-carousel]')!;
    const track = root.querySelector<HTMLElement>('[data-carousel-track]')!;
    Object.defineProperties(track, {
      clientWidth: { value: 1200, configurable: true },
      scrollWidth: { value: 1875, configurable: true },
    });
    for (const slide of track.querySelectorAll<HTMLElement>('[data-carousel-slide]')) {
      slide.getBoundingClientRect = () => ({ width: 375 }) as DOMRect;
    }
    return { root, track };
  }

  it('disables prev at the start and announces the position', () => {
    const { root } = mount();
    initCarousel(root);
    expect(root.querySelector('[data-carousel-prev]')!.getAttribute('aria-disabled')).toBe('true');
    expect(root.querySelector('[data-carousel-next]')!.getAttribute('aria-disabled')).toBe('false');
    expect(root.querySelector('[data-carousel-status]')!.textContent).toBe('Showing review 1 of 5');
    expect(root.hasAttribute('data-enhanced')).toBe(true);
  });

  it('scrolls by one slide on next and ignores disabled prev', () => {
    const { root, track } = mount();
    const scrollBy = vi.fn();
    track.scrollBy = scrollBy as typeof track.scrollBy;
    initCarousel(root);
    root.querySelector<HTMLButtonElement>('[data-carousel-prev]')!.click();
    expect(scrollBy).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('[data-carousel-next]')!.click();
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 375 }));
  });
});
