import { describe, expect, it } from 'vitest';

import { closedSpline, loopPath, segmentLength, segmentPath, stopDistances } from '../../src/lib/flow-path';

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('closedSpline', () => {
  it('creates one segment per point and passes exactly through every point', () => {
    const segments = closedSpline(square);
    expect(segments).toHaveLength(4);
    segments.forEach((s, i) => {
      expect(s.from).toEqual(square[i]);
      expect(s.to).toEqual(square[(i + 1) % square.length]);
    });
  });

  it('is empty for fewer than two points', () => {
    expect(closedSpline([{ x: 1, y: 1 }])).toEqual([]);
  });
});

describe('segmentLength', () => {
  it('measures a straight segment exactly', () => {
    const straight = { from: { x: 0, y: 0 }, c1: { x: 10, y: 0 }, c2: { x: 20, y: 0 }, to: { x: 30, y: 0 } };
    expect(segmentLength(straight)).toBeCloseTo(30, 5);
  });
});

describe('stopDistances', () => {
  it('starts at 0% and increases monotonically below 100%', () => {
    const stops = stopDistances(closedSpline(square));
    expect(stops[0]).toBe(0);
    expect(stops).toHaveLength(4);
    for (let i = 1; i < stops.length; i += 1) expect(stops[i]!).toBeGreaterThan(stops[i - 1]!);
    expect(stops[stops.length - 1]!).toBeLessThan(100);
  });

  it('splits a symmetric loop evenly', () => {
    expect(stopDistances(closedSpline(square))).toEqual([0, 25, 50, 75]);
  });
});

describe('path data', () => {
  it('builds a continuous loop and standalone segments', () => {
    const segments = closedSpline(square);
    expect(loopPath(segments).startsWith('M 0 0 C')).toBe(true);
    expect(loopPath(segments).match(/C /g)).toHaveLength(4);
    expect(segmentPath(segments[0]!)).toMatch(/^M 0 0 C .+, 100 0$/);
  });
});
