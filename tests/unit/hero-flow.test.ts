import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { hero } from '../../src/content/site';
import {
  AGENT_CORE,
  flowNodes,
  GAZE,
  GAZE_FRONT,
  HEAD,
  hops,
  NODE_RADIUS,
  ROBOT,
  spokes,
  STAGE,
} from '../../src/lib/hero-flow';
import {
  BLINK_MS,
  blinkOpen,
  easeInOut,
  EYE_GLIDE_MS,
  eyeShift,
  EDGE_WIDTH,
  eyeWidth,
  GLOW_STOPS,
  HEAD_TURN_MS,
  headFillTop,
  headPose,
  helmetRows,
  POSE,
  tiltPivot,
  turnPoint,
  turnRow,
  turnSource,
  turnWeight,
  headChargeShare,
  chargeGradientSpan,
  CHARGE_STOPS,
  levelFor,
  parseHops,
  parseRig,
  spreadSpoke,
  springStep,
} from '../../src/scripts/hero';

describe('hero flow layout', () => {
  it('numbers participants by first involvement, 1..n', () => {
    expect(flowNodes.map((n) => n.id)).toEqual(hero.nodes.map((n) => n.id));
    expect(flowNodes.map((n) => n.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('matches the robot box hard-coded in AgentFlow.astro CSS (.flow__robot)', () => {
    expect(ROBOT).toEqual({ x: 248.5, y: 10, width: 343, height: 875 });
    // Taller than the stage: its bottom edge crops the robot (at the shins).
    expect(ROBOT.y + ROBOT.height).toBeGreaterThan(STAGE.height);
  });

  it('matches the head box hard-coded in AgentFlow.astro CSS (.flow__head and the photo mask)', () => {
    const css = readFileSync('src/components/hero/AgentFlow.astro', 'utf8');
    const rule = /\.flow__head \{([^}]*)\}/.exec(css)?.[1] ?? '';
    const px = (prop: string) => Number(new RegExp(String.raw`\b${prop}: ([\d.]+)px`).exec(rule)?.[1]);
    const { x, width, height } = HEAD.box;
    expect({ x: px('left'), width: px('width'), height: px('height') }).toEqual({ x, width, height });
    const hole = HEAD.hole;
    expect(css).toMatch(new RegExp(String.raw`mask-size:\s*100% 100%,\s*${hole.width}px ${hole.height}px;`));
    expect(css).toMatch(new RegExp(String.raw`mask-position:\s*0 0,\s*${hole.x}px 0;`));
    // The hole sits inside the canvas, flush with its top (the helmet's background) only.
    expect(hole.x).toBeGreaterThan(x);
    expect(hole.x + hole.width).toBeLessThan(x + width);
    expect(hole.height).toBeLessThan(height);
  });

  it('rests facing front, attends left to the USER and GUARDRAILS, right to the LLM, RAG and TOOLS', () => {
    expect(GAZE_FRONT).toEqual([0, 0]);
    for (const [x, y] of Object.values(GAZE)) expect(Math.hypot(x, y)).toBeCloseTo(1, 2);
    expect(GAZE.user[0]).toBeLessThan(-0.9);
    expect(GAZE.llm[0]).toBeGreaterThan(0.9);
    // GUARDRAILS: left, less far than the USER, and lower.
    expect(GAZE.guardrails[0]).toBeGreaterThan(GAZE.user[0]);
    expect(GAZE.guardrails[0]).toBeLessThan(-0.4);
    expect(GAZE.guardrails[1]).toBeGreaterThan(GAZE.user[1]);
    for (const id of ['llm', 'rag', 'tools'] as const) expect(GAZE[id][0]).toBeGreaterThan(0.35);
    // Down the right-hand column: LLM, then RAG, then TOOLS.
    expect(GAZE.llm[1]).toBeLessThan(GAZE.rag[1]);
    expect(GAZE.rag[1]).toBeLessThan(GAZE.tools[1]);
  });

  it('rigs the head from the photo: two level eye lights either side of the visor middle, the pivot at the neck', () => {
    const { pivot, eyes, glow } = HEAD.rig;
    const [[lx = 0, ly = 0] = [], [rx = 0, ry = 0] = []] = eyes;
    const [centre = 0, inner = 0, outer = 0] = HEAD.rig.visor;
    const [pivotX = 0, pivotY = 0] = pivot;
    expect(eyes).toHaveLength(2);
    expect(ly).toBeCloseTo(ry, 2);
    expect(ly).toBeGreaterThan(0.4);
    expect(ly).toBeLessThan(0.6);
    // Facing front: the lights sit symmetrically about the visor's middle, which is the head box's.
    expect((lx + rx) / 2).toBeCloseTo(centre, 4);
    expect(centre).toBeCloseTo(0.5, 1);
    expect(inner).toBeCloseTo((rx - lx) / 2, 4);
    expect(outer).toBeGreaterThan(inner);
    expect(pivotX).toBeCloseTo(centre, 1);
    expect(pivotY).toBeGreaterThan(0.85);
    expect(glow).toBeLessThan(0.15);
  });

  it('hands the charge fill from the body to the head over a soft edge, so the shoulders show no seam', () => {
    const [w, h, f] = [255, 309, 10];
    // Inside the head box the canvas draws all of the fill; at its sides and bottom none of it.
    expect(headChargeShare(w / 2, h / 2, w, h, f)).toBe(1);
    expect(headChargeShare(w / 2, 0, w, h, f)).toBe(1);
    expect(headChargeShare(0, h / 2, w, h, f)).toBe(0);
    expect(headChargeShare(w, h / 2, w, h, f)).toBe(0);
    expect(headChargeShare(w / 2, h, w, h, f)).toBe(0);
    // Halfway through the ramp; the body's CSS fill (the inverse ramp) supplies the other half.
    expect(headChargeShare(f / 2, h / 2, w, h, f)).toBeCloseTo(0.5);
    expect(headChargeShare(w / 2, h - f / 2, w, h, f)).toBeCloseTo(0.5);
    expect(HEAD.rig.chargeFeather).toBeGreaterThan(0.01);
    expect(HEAD.rig.chargeFeather).toBeLessThan(0.06);
  });

  it('keeps every bubble (nearly) inside the stage and clear of the robot', () => {
    for (const node of flowNodes.filter((n) => n.id !== 'agent')) {
      expect(node.x - NODE_RADIUS).toBeGreaterThanOrEqual(0);
      // Right-hand bubbles may overhang the stage slightly (into the page gutter).
      expect(node.x + NODE_RADIUS).toBeLessThanOrEqual(STAGE.width + 16);
      const overlapsRobot = node.x + NODE_RADIUS > ROBOT.x + 30 && node.x - NODE_RADIUS < ROBOT.x + ROBOT.width - 30;
      expect(overlapsRobot).toBe(false);
    }
  });

  it('has one spoke per participant, each starting at the agent core', () => {
    expect(spokes.map((s) => s.id).sort()).toEqual(['guardrails', 'llm', 'rag', 'tools', 'user']);
    for (const spoke of spokes) {
      expect(spoke.out.startsWith(`M ${AGENT_CORE.x} ${AGENT_CORE.y} Q`)).toBe(true);
      expect(spoke.back.endsWith(`${AGENT_CORE.x} ${AGENT_CORE.y}`)).toBe(true);
    }
    // The user's spoke is first used inward (the request), so it draws towards the agent.
    expect(spokes.find((s) => s.id === 'user')?.firstDirection).toBe('back');
  });
});

describe('hop sequence (tool-calling loop)', () => {
  it('routes every hop through the agent', () => {
    for (const h of hero.hops) expect(h.from === 'agent' || h.to === 'agent').toBe(true);
  });

  it('runs retrieval and tools only right after the LLM requests them', () => {
    const seq = hops.map(
      (h) => `${h.direction === 'out' ? 'agent>' : ''}${h.spoke}${h.direction === 'back' ? '>agent' : ''}`,
    );
    for (const tool of ['agent>rag', 'agent>tools']) expect(seq[seq.indexOf(tool) - 1]).toBe('llm>agent');
    // Results go back to the LLM before the next decision.
    expect(seq[seq.indexOf('rag>agent') + 1]).toBe('agent>llm');
    expect(seq[seq.indexOf('tools>agent') + 1]).toBe('agent>llm');
    expect(seq[0]).toBe('user>agent');
    expect(seq.at(-1)).toBe('agent>user');
  });
});

describe('controller helpers', () => {
  it('maps completed hops to a 0-1 energy level and clamps', () => {
    expect(levelFor(0, 14)).toBe(0);
    expect(levelFor(14, 14)).toBe(1);
    expect(levelFor(20, 14)).toBe(1);
    expect(levelFor(1, 0)).toBe(0);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    // The fill reaches the head (the top `seam` of the robot) only near the end of the run.
    expect(headFillTop(0.5, 0.2)).toBe(1);
    expect(headFillTop(0.9, 0.2)).toBeCloseTo(0.5);
    expect(headFillTop(1, 0.2)).toBe(0);
    // The head's fill uses the CSS fill's own gradients, spanning the risen fill from its top to the feet.
    const css = readFileSync('src/components/hero/AgentFlow.astro', 'utf8');
    const stops = (list: readonly (readonly [number, string])[]) =>
      list
        .map(([offset, color]) => `${color}${offset === 0 || offset === 1 ? '' : ` ${Math.round(offset * 100)}%`}`)
        .join(', ');
    expect(css).toContain(`linear-gradient(180deg, ${stops(CHARGE_STOPS.blue)})`);
    expect(css).toContain(`linear-gradient(180deg, ${stops(CHARGE_STOPS.green)})`);
    expect(chargeGradientSpan(1, 0.2, 100)).toEqual([0, 500]);
    expect(chargeGradientSpan(0.9, 0.2, 100)[0]).toBeCloseTo(50);
  });

  it('leaves the photo exactly as it is when facing front (first paint, no-JS and reduced motion)', () => {
    expect(headPose(GAZE_FRONT, GAZE_FRONT)).toEqual({ yaw: 0, angle: 0, dx: 0, dy: 0 });
    expect(eyeShift(GAZE_FRONT, GAZE_FRONT)).toEqual([0, 0]);
  });

  it('turns the head toward the participant (at most 10 degrees, tilted at most 4), the eyes staying on the visor', () => {
    const deg = (rad: number) => (rad * 180) / Math.PI;
    for (const gaze of Object.values(GAZE)) {
      const pose = headPose(gaze, GAZE_FRONT);
      expect(Math.abs(deg(pose.yaw))).toBeLessThanOrEqual(10.05);
      expect(Math.abs(deg(pose.angle))).toBeLessThanOrEqual(4);
      expect(Math.abs(pose.dx)).toBeLessThan(0.02);
      expect(Math.abs(pose.dy)).toBeLessThan(0.02);
      const [ex, ey] = eyeShift(gaze, GAZE_FRONT);
      expect(Math.abs(ex)).toBeLessThan(0.06);
      expect(ey).toBeGreaterThanOrEqual(0);
      expect(ey).toBeLessThan(0.03);
      const [centre = 0, , outer = 0] = HEAD.rig.visor;
      for (const [x = 0] of HEAD.rig.eyes) expect(Math.abs(x + ex - centre)).toBeLessThan(outer);
    }
    // Left for the USER and GUARDRAILS, right for the LLM, RAG and TOOLS: head and eyes alike.
    for (const id of ['user', 'guardrails'] as const) {
      expect(eyeShift(GAZE[id], GAZE_FRONT)[0]).toBeLessThan(-0.02);
      expect(headPose(GAZE[id], GAZE_FRONT).yaw).toBeLessThan(0);
      expect(headPose(GAZE[id], GAZE_FRONT).angle).toBeLessThan(0);
    }
    for (const id of ['llm', 'rag', 'tools'] as const) {
      expect(eyeShift(GAZE[id], GAZE_FRONT)[0]).toBeGreaterThan(0.02);
      expect(headPose(GAZE[id], GAZE_FRONT).yaw).toBeGreaterThan(0);
      expect(headPose(GAZE[id], GAZE_FRONT).angle).toBeGreaterThan(0);
    }
    expect(deg(Math.abs(headPose(GAZE.user, GAZE_FRONT).angle))).toBeGreaterThan(3.9);
    expect(eyeShift(GAZE.tools, GAZE_FRONT)[1]).toBeGreaterThan(eyeShift(GAZE.llm, GAZE_FRONT)[1]);
  });

  it('lets the head carry most of the gaze: at the eyes it moves more than twice as far as the eyes glide', () => {
    const { pose, eyes } = { pose: headPose(GAZE.llm, GAZE_FRONT), eyes: eyeShift(GAZE.llm, GAZE_FRONT)[0] };
    const [[eyeX = 0, eyeY = 0] = []] = HEAD.rig.eyes;
    const [, pivotY = 0] = HEAD.rig.pivot;
    // Head-box widths at the eyes: the turn (at the eyes' place across a ~0.77-wide helmet row), the
    // tilt (the eyes sit ~0.55 box widths above the pivot) and the shift.
    const half = 0.385;
    const u = (eyeX - HEAD.rig.visor[0]!) / half;
    const turn = Math.sin(pose.yaw) * half * (1 - u * u);
    const tilt = Math.sin(pose.angle) * (pivotY - eyeY) * (309 / 255);
    expect(turn + tilt + pose.dx).toBeGreaterThan(2 * eyes);
    expect(POSE.eyeX).toBeCloseTo((0.08 * 2) / 3, 2);
  });

  it('turns the face around the outline: the silhouette stays, the middle moves, the far side narrows', () => {
    const k = Math.sin((10 * Math.PI) / 180);
    expect(turnPoint(-1, k)[0]).toBeCloseTo(-1, 10);
    expect(turnPoint(1, k)[0]).toBeCloseTo(1, 10);
    expect(turnPoint(0, k)[0]).toBeCloseTo(k, 10);
    // The side turning away (right, for a right turn) narrows; the other widens; nothing folds over.
    expect(turnPoint(0.6, k)[1]).toBeLessThan(1);
    expect(turnPoint(-0.6, k)[1]).toBeGreaterThan(1);
    for (let u = -1; u <= 1; u += 0.05) {
      expect(turnPoint(u, k)[1]).toBeGreaterThan(0);
      expect(turnSource(turnPoint(u, k)[0], k)).toBeCloseTo(u, 9);
      expect(turnSource(u, 0)).toBe(u);
    }
    // The chin's rows don't turn, the face's do.
    const fade = [0.73, 0.9] as const;
    expect(turnWeight(0.5, fade)).toBe(1);
    expect(turnWeight(0.95, fade)).toBe(0);
    expect(turnWeight(0.815, fade)).toBeCloseTo(0.5);
  });

  it('tilts about the chin corner on the side turning away, so that side never lifts', () => {
    const tenth = (0.1 * Math.PI) / 180;
    expect(tiltPivot(0, 0.5, 0.2)).toBe(0.5);
    // Looking right (clockwise): the left corner; left: the right corner; continuous through zero.
    expect(tiltPivot((4 * Math.PI) / 180, 0.5, 0.2)).toBeCloseTo(0.3, 3);
    expect(tiltPivot((-4 * Math.PI) / 180, 0.5, 0.2)).toBeCloseTo(0.7, 3);
    expect(Math.abs(tiltPivot(tenth, 0.5, 0.2) - tiltPivot(-tenth, 0.5, 0.2))).toBeLessThan(0.1);
  });

  it('turns a row of pixels: the outline stays, opaque pixels blend smoothly, nothing outside the row changes', () => {
    const w = 40;
    // An opaque ramp (red rises left to right) across x 5-34, transparent outside.
    const src = new Uint32Array(w).map((_, x) => (x >= 5 && x < 35 ? (0xff000000 | ((x - 5) * 8)) >>> 0 : 0));
    const out = src.slice();
    const [middle, half, k] = [20, 15, Math.sin((10 * Math.PI) / 180)];
    turnRow(src, out, 0, w, middle, half, k);
    const red = (v: number | undefined) => (v ?? 0) & 255;
    for (let x = 0; x < w; x += 1) {
      // A float reference: the same point of the photo, linearly interpolated.
      const u = Math.min(1, Math.max(-1, (x + 0.5 - middle) / half));
      const sx = Math.min(w - 1, Math.max(0, middle + half * turnSource(u, k) - 0.5));
      if (x < 5 || x >= 35) expect(out[x]).toBe(src[x]);
      else if (x > 5 && x < 34) expect(Math.abs(red(out[x]) - (sx - 5) * 8)).toBeLessThanOrEqual(1.5);
    }
    // The middle of the row now shows a point of the photo from further left (the face moved right).
    expect(red(out[20])).toBeLessThan(red(src[20]));
  });

  it("draws the photo's shadow inside the head's hole with the CSS shadow's own numbers", () => {
    const css = readFileSync('src/components/hero/AgentFlow.astro', 'utf8');
    const [offset, blur, opacity] = HEAD.rig.shadow;
    expect(css).toContain(`drop-shadow(0 ${offset}px ${blur}px rgb(0 0 0 / ${Math.round((opacity ?? 0) * 100)}%))`);
  });

  it("finds each row's outline in the helmet layer, smoothed across rows", () => {
    const [w, h] = [20, 12];
    // A disc-ish shape: rows 2-9, wider in the middle.
    const alpha = (i: number) => {
      const [x, y] = [i % w, Math.floor(i / w)];
      const half = y < 2 || y > 9 ? 0 : 3 + Math.min(y - 2, 9 - y);
      return Math.abs(x + 0.5 - 10) < half ? 255 : 0;
    };
    const rows = helmetRows(alpha, w, h);
    expect(Number.isNaN(rows[0])).toBe(true);
    expect(rows[5 * 2]).toBeCloseTo(10, 5);
    expect(rows[5 * 2 + 1]).toBeGreaterThan(4);
    expect(rows[5 * 2 + 1]).toBeLessThan(7);
  });

  it('blinks smoothly: one dip, open at both ends, never a jump', () => {
    expect(blinkOpen(-1)).toBe(1);
    expect(blinkOpen(0)).toBe(1);
    expect(blinkOpen(BLINK_MS)).toBe(1);
    expect(blinkOpen(BLINK_MS / 2)).toBeCloseTo(0.15);
    let prev = 1;
    for (let t = 0; t <= BLINK_MS; t += 1000 / 120) {
      expect(Math.abs(blinkOpen(t) - prev)).toBeLessThan(0.08);
      prev = blinkOpen(t);
    }
  });

  it('glows like the photo, fading to nothing, and narrows only as a light nears the visor edge', () => {
    expect(GLOW_STOPS[0]).toEqual([0, 'rgb(152 219 255 / 0.795)']);
    expect(GLOW_STOPS.at(-1)).toEqual([1, 'rgb(0 127 255 / 0)']);
    const visor = [0.5, 0.12, 0.22] as const;
    // Full width where the photo's lights sit (and nearer the middle); narrower toward either edge.
    expect(eyeWidth(0.5, visor)).toBe(1);
    expect(eyeWidth(0.38, visor)).toBe(1);
    expect(eyeWidth(0.62, visor)).toBe(1);
    expect(eyeWidth(0.33, visor)).toBeCloseTo(eyeWidth(0.67, visor), 10);
    expect(eyeWidth(0.33, visor)).toBeLessThan(1);
    expect(eyeWidth(0.2, visor)).toBe(EDGE_WIDTH);
  });

  it('turns the head smoothly: no overshoot, ~95% of the way after HEAD_TURN_MS', () => {
    let pos = 0;
    let vel = 0;
    let max = 0;
    const dt = 1 / 120;
    for (let t = 0; t < HEAD_TURN_MS / 1000; t += dt) {
      [pos, vel] = springStep(pos, vel, 47, dt);
      max = Math.max(max, pos);
    }
    expect(pos).toBeGreaterThan(47 * 0.93);
    expect(max).toBeLessThanOrEqual(47);
  });

  it('glides the eyes on the same spring, quicker than the head (1.2 s), so they lead the turn', () => {
    expect(HEAD_TURN_MS).toBe(1200);
    const omega = 4.74 / (EYE_GLIDE_MS / 1000);
    let pos = 0;
    let vel = 0;
    let max = 0;
    for (let t = 0; t < EYE_GLIDE_MS / 1000; t += 1 / 120) {
      [pos, vel] = springStep(pos, vel, 1, 1 / 120, omega);
      max = Math.max(max, pos);
    }
    expect(pos).toBeGreaterThan(0.93);
    expect(max).toBeLessThanOrEqual(1);
    expect(EYE_GLIDE_MS).toBeLessThan(HEAD_TURN_MS);
  });

  it('parses hop data defensively', () => {
    expect(parseHops(undefined)).toEqual([]);
    expect(parseHops('not json')).toEqual([]);
    expect(parseHops('[{"spoke":"user","direction":"back","to":"agent","label":"request"}]')).toHaveLength(1);
  });

  it('parses the head rig defensively', () => {
    const rig = { ...HEAD.rig, gaze: GAZE, front: GAZE_FRONT };
    expect(parseRig(JSON.stringify(rig))?.front).toEqual([0, 0]);
    expect(parseRig(undefined)).toBeUndefined();
    expect(parseRig('{')).toBeUndefined();
    expect(parseRig(JSON.stringify({ ...rig, front: undefined }))).toBeUndefined();
    expect(parseRig(JSON.stringify({ ...rig, visor: [0.5] }))).toBeUndefined();
    expect(parseRig(JSON.stringify({ ...rig, eyes: undefined }))).toBeUndefined();
  });
});

describe('stage spread (wide, short desktop windows)', () => {
  it('moves only right-hand spokes, by the extra width, keeping the curve', () => {
    const right = spreadSpoke('M 389 339 Q 500 200 666 200', 'M 666 200 Q 500 200 389 339', 40);
    expect(right).toEqual({ out: 'M 389 339 Q 520 200 706 200', back: 'M 706 200 Q 520 200 389 339', shift: 40 });
    const left = spreadSpoke('M 389 339 Q 250 220 84 200', 'M 84 200 Q 250 220 389 339', 40);
    expect(left.shift).toBe(0);
    expect(left.out).toBe('M 389 339 Q 250 220 84 200');
    expect(spreadSpoke('M 389 339 Q 500 200 666 200', 'x', 0).shift).toBe(0);
  });
});
