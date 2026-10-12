import { describe, expect, it } from 'vitest';

import { reviews } from '../../src/content/reviews';
import { numberToWord, site, yearsSince } from '../../src/content/site';
import { mailtoHref } from '../../src/lib/email';

describe('yearsSince', () => {
  const start = new Date('2022-05-01T00:00:00Z');

  it('counts whole years only', () => {
    expect(yearsSince(start, new Date('2026-04-30T00:00:00Z'))).toBe(3);
    expect(yearsSince(start, new Date('2026-05-01T00:00:00Z'))).toBe(4);
    expect(yearsSince(start, new Date('2026-10-12T00:00:00Z'))).toBe(4);
  });

  it('never goes negative', () => {
    expect(yearsSince(start, new Date('2020-01-01T00:00:00Z'))).toBe(0);
  });
});

describe('numberToWord', () => {
  it('spells small numbers and falls back to digits', () => {
    expect(numberToWord(4)).toBe('Four');
    expect(numberToWord(12)).toBe('12');
  });
});

describe('mailtoHref', () => {
  it('percent-encodes the whole address so it never appears in plain text', () => {
    const href = mailtoHref('jane', 'example.com');
    expect(href).toBe('mailto:%6A%61%6E%65%40%65%78%61%6D%70%6C%65%2E%63%6F%6D');
    expect(decodeURIComponent(href)).toBe('mailto:jane@example.com');
    expect(href).not.toContain('@');
  });
});

describe('launch content guards', () => {
  it('never ships placeholder reviews', () => {
    for (const item of reviews.items) {
      expect(`${item.quote}${item.name}${item.role}`).not.toMatch(/\[[^\]]+\]/);
    }
  });

  it('uses one job title everywhere', () => {
    expect(site.tagline.startsWith(site.jobTitle)).toBe(true);
    expect(site.description).toContain(site.jobTitle);
  });
});
