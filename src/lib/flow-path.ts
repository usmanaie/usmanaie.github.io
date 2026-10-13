/**
 * Geometry for the hero's agent flow: a smooth closed loop through the step positions.
 *
 * Points are joined with Catmull-Rom splines converted to cubic Béziers, so one continuous
 * SVG/offset-path curve passes exactly through every step. Arc lengths are measured at
 * build time, which gives the travelling agent token the exact offset-distance (%) of
 * each step without measuring the DOM at runtime.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through `points` as cubic Bézier segments (tension 0.5). */
export function closedSpline(points: readonly Point[]): Segment[] {
  const n = points.length;
  if (n < 2) return [];
  const at = (i: number) => points[((i % n) + n) % n] as Point;
  return points.map((_, i) => {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    return {
      from: p1,
      c1: { x: round(p1.x + (p2.x - p0.x) / 6), y: round(p1.y + (p2.y - p0.y) / 6) },
      c2: { x: round(p2.x - (p3.x - p1.x) / 6), y: round(p2.y - (p3.y - p1.y) / 6) },
      to: p2,
    };
  });
}

function bezierPoint(s: Segment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s.from.x + b * s.c1.x + c * s.c2.x + d * s.to.x,
    y: a * s.from.y + b * s.c1.y + c * s.c2.y + d * s.to.y,
  };
}

/** Arc length of one cubic segment, by sampling (accurate to well under a pixel here). */
export function segmentLength(s: Segment, samples = 200): number {
  let length = 0;
  let prev = s.from;
  for (let i = 1; i <= samples; i += 1) {
    const p = bezierPoint(s, i / samples);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return length;
}

/** SVG path data for one segment (used for the progressively drawn connectors). */
export function segmentPath(s: Segment): string {
  return `M ${s.from.x} ${s.from.y} C ${s.c1.x} ${s.c1.y}, ${s.c2.x} ${s.c2.y}, ${s.to.x} ${s.to.y}`;
}

/** SVG path data for the whole closed loop (used as the token's offset-path). */
export function loopPath(segments: readonly Segment[]): string {
  const first = segments[0];
  if (!first) return '';
  return [
    `M ${first.from.x} ${first.from.y}`,
    ...segments.map((s) => `C ${s.c1.x} ${s.c1.y}, ${s.c2.x} ${s.c2.y}, ${s.to.x} ${s.to.y}`),
  ].join(' ');
}

/**
 * offset-distance (0-100%) of every point along the closed loop. Index 0 is the start (0%);
 * index i is where segment i-1 ends.
 */
export function stopDistances(segments: readonly Segment[]): number[] {
  const lengths = segments.map((s) => segmentLength(s));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  const stops = [0];
  let run = 0;
  for (const l of lengths.slice(0, -1)) {
    run += l;
    stops.push(Math.round((run / total) * 10000) / 100);
  }
  return stops;
}
