import { afterEach, describe, expect, it } from 'vitest';

import { createMenu, nextTrapTarget } from '../../src/scripts/menu';

function els(n: number) {
  return Array.from({ length: n }, () => document.createElement('a'));
}

describe('nextTrapTarget', () => {
  it('wraps from the last element to the first on Tab', () => {
    const [a, b, c] = els(3);
    expect(nextTrapTarget([a!, b!, c!], c!, false)).toBe(a);
  });

  it('wraps from the first element to the last on Shift+Tab', () => {
    const [a, b, c] = els(3);
    expect(nextTrapTarget([a!, b!, c!], a!, true)).toBe(c);
  });

  it('lets the browser move focus inside the trap', () => {
    const [a, b, c] = els(3);
    expect(nextTrapTarget([a!, b!, c!], b!, false)).toBeNull();
  });

  it('pulls focus back in when it escaped the trap', () => {
    const [a, b] = els(2);
    expect(nextTrapTarget([a!, b!], document.body, false)).toBe(a);
  });

  it('does nothing without focusable elements', () => {
    expect(nextTrapTarget([], null, false)).toBeNull();
  });
});

describe('createMenu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
  });

  function mount() {
    document.body.innerHTML = `
      <button id="toggle" aria-expanded="false" aria-controls="menu"><span id="label">Open menu</span></button>
      <div id="menu" hidden><a href="#a">A</a><a href="#b">B</a></div>
      <main id="main"></main>`;
    const toggle = document.getElementById('toggle') as HTMLButtonElement;
    const panel = document.getElementById('menu')!;
    const main = document.getElementById('main')!;
    const menu = createMenu({ toggle, panel, label: document.getElementById('label'), background: [main] });
    return { toggle, panel, main, menu };
  }

  it('opens: expands, shows the panel, focuses the first link, locks scroll, inerts the page', () => {
    const { toggle, panel, main } = mount();
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    expect(document.activeElement).toBe(panel.querySelector('a'));
    expect(document.body.classList.contains('is-scroll-locked')).toBe(true);
    expect(main.inert).toBe(true);
    expect(document.getElementById('label')!.textContent).toBe('Close menu');
  });

  it('closes on Escape and returns focus to the toggle', () => {
    const { toggle, panel, main } = mount();
    toggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(main.inert).toBe(false);
    expect(document.activeElement).toBe(toggle);
    expect(document.body.classList.contains('is-scroll-locked')).toBe(false);
  });

  it('closes when a link inside is activated', () => {
    const { toggle, panel } = mount();
    toggle.click();
    panel.querySelector<HTMLAnchorElement>('a')!.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
