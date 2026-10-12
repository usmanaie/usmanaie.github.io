import { describe, expect, it } from 'vitest';

import { pickActive, setCurrent } from '../../src/scripts/scroll-spy';

const order = ['top', 'about', 'education', 'expertise'];

describe('pickActive', () => {
  it('returns null when nothing is in the reading band', () => {
    expect(pickActive(new Map(), order)).toBeNull();
  });

  it('picks the only visible section', () => {
    expect(pickActive(new Map([['about', 120]]), order)).toBe('about');
  });

  it('prefers the section whose top is highest when several overlap the band', () => {
    const visible = new Map([
      ['education', 300],
      ['about', -50],
    ]);
    expect(pickActive(visible, order)).toBe('about');
  });

  it('ignores ids that are not part of the nav order', () => {
    expect(pickActive(new Map([['unknown', 0]]), order)).toBeNull();
  });
});

describe('setCurrent', () => {
  it('marks matching links in every nav and clears the rest', () => {
    document.body.innerHTML = `
      <a data-spy-link="top" aria-current="location"></a>
      <a data-spy-link="about"></a>
      <a data-spy-link="about"></a>`;
    const links = document.querySelectorAll<HTMLAnchorElement>('a');
    setCurrent(links, 'about');
    expect([...links].map((l) => l.getAttribute('aria-current'))).toEqual([null, 'location', 'location']);
  });
});
