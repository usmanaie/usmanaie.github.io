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
    expect(headPose(GAZE_FRONT, GAZE_FRONT)).toEqual({ angle: 0, dx: 0, dy: 0 });
    expect(eyeShift(GAZE_FRONT, GAZE_FRONT)).toEqual([0, 0]);
  });

  it('moves the head subtly: the helmet tilts at most 2.5 degrees, the eyes stay on the visor', () => {
    const deg = (rad: number) => (rad * 180) / Math.PI;
    for (const gaze of Object.values(GAZE)) {
      const pose = headPose(gaze, GAZE_FRONT);
      expect(Math.abs(deg(pose.angle))).toBeLessThanOrEqual(2.5);
      expect(Math.abs(pose.dx)).toBeLessThan(0.02);
      expect(Math.abs(pose.dy)).toBeLessThan(0.02);
      const [ex, ey] = eyeShift(gaze, GAZE_FRONT);
      expect(Math.abs(ex)).toBeLessThan(0.1);
      expect(ey).toBeGreaterThanOrEqual(0);
      expect(ey).toBeLessThan(0.05);
      // The glide never takes a light past the visor's narrowing span.
      const [centre = 0, , outer = 0] = HEAD.rig.visor;
      for (const [x = 0] of HEAD.rig.eyes) expect(Math.abs(x + ex - centre)).toBeLessThan(outer);
    }
    // Left for the USER and GUARDRAILS, right for the LLM, RAG and TOOLS: eyes and helmet alike.
    for (const id of ['user', 'guardrails'] as const) {
      expect(eyeShift(GAZE[id], GAZE_FRONT)[0]).toBeLessThan(-0.03);
      expect(headPose(GAZE[id], GAZE_FRONT).angle).toBeLessThan(0);
    }
    for (const id of ['llm', 'rag', 'tools'] as const) {
      expect(eyeShift(GAZE[id], GAZE_FRONT)[0]).toBeGreaterThan(0.03);
      expect(headPose(GAZE[id], GAZE_FRONT).angle).toBeGreaterThan(0);
    }
    expect(deg(Math.abs(headPose(GAZE.llm, GAZE_FRONT).angle))).toBeGreaterThan(2.3);
    // To the tools (low down), the eyes drop further.
    expect(eyeShift(GAZE.tools, GAZE_FRONT)[1]).toBeGreaterThan(eyeShift(GAZE.llm, GAZE_FRONT)[1]);
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

  it('glides the eyes on the same spring, quicker than the head, so they lead the turn', () => {
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
