import { describe, expect, it } from 'vitest';

import { experience } from '../../src/content/experience';
import { formatMonth, periodLabel } from '../../src/lib/experience-dates';

describe('experience dates', () => {
  it('formats months and periods as on LinkedIn', () => {
    expect(formatMonth('2026-07')).toBe('Jul 2026');
    expect(periodLabel('2024-05', '2026-07')).toBe('May 2024 – Jul 2026');
    expect(periodLabel('2026-07')).toBe('Jul 2026 – Present');
  });

  it('lists companies and their roles newest first, each role described', () => {
    const starts = experience.companies.map((c) => c.roles[0]?.start ?? '');
    expect([...starts].sort().reverse()).toEqual(starts);
    for (const company of experience.companies) {
      const roleStarts = company.roles.map((r) => r.start);
      expect([...roleStarts].sort().reverse()).toEqual(roleStarts);
      for (const role of company.roles) expect(role.summary.length).toBeGreaterThan(40);
    }
  });
});
