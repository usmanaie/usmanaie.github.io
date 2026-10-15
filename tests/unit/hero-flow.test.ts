import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { hero } from '../../src/content/site';
import {
  AGENT_CORE,
  flowNodes,
  GAZE,
  GAZE_REST,
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
  glowStops,
  HEAD_TURN_MS,
  headFillTop,
  headPose,
  headTintColor,
  levelFor,
  parseHops,
  parseRig,
  roundness,
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

  it('attends left to the USER (the photo itself, at rest) and right to the LLM, RAG and tools', () => {
    expect(GAZE_REST).toBe('user');
    for (const [x, y] of Object.values(GAZE)) expect(Math.hypot(x, y)).toBeCloseTo(1, 2);
    expect(GAZE.user[0]).toBeLessThan(-0.9);
    // GUARDRAILS: slightly left of the USER's direction, and lower.
    expect(GAZE.guardrails[0]).toBeGreaterThan(GAZE.user[0]);
    expect(GAZE.guardrails[0]).toBeLessThan(0);
    expect(GAZE.guardrails[1]).toBeGreaterThan(GAZE.user[1]);
    for (const id of ['llm', 'rag', 'tools'] as const) expect(GAZE[id][0]).toBeGreaterThan(0.4);
    // Down the right-hand column: LLM, then RAG, then TOOLS.
    expect(GAZE.llm[1]).toBeLessThan(GAZE.rag[1]);
    expect(GAZE.rag[1]).toBeLessThan(GAZE.tools[1]);
  });

  it('rigs the head from the photo: the eye lights on the visor, the tilt pivot at the neck', () => {
    const { pivot, eyes, glow, foreshortened } = HEAD.rig;
    expect(eyes).toHaveLength(2);
    for (const [x, y] of eyes) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(0.5);
      expect(y).toBeGreaterThan(0.4);
      expect(y).toBeLessThan(0.6);
    }
    expect(pivot[1]).toBeGreaterThan(0.85);
    expect(glow).toBeLessThan(0.15);
    // The left light is the foreshortened one; the right one is fully round.
    expect(foreshortened[0]).toBeCloseTo(eyes[0]?.[0] ?? 0, 4);
    expect(foreshortened[1]).toBeLessThan(eyes[1]?.[0] ?? 0);
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
    expect(headTintColor(0)).toBe('rgb(130 210 255 / 0.55)');
    expect(headTintColor(1)).toBe('rgb(120 240 170 / 0.6)');
  });

  it('leaves the photo exactly as it is at rest (the first paint, no-JS and reduced motion)', () => {
    const rest = GAZE[GAZE_REST];
    expect(headPose(rest, rest)).toEqual({ angle: 0, dx: 0, dy: 0 });
    expect(eyeShift(rest, rest)).toEqual([0, 0]);
  });

  it('moves the head subtly: the helmet tilts under 3 degrees, the eyes stay on the visor', () => {
    const rest = GAZE[GAZE_REST];
    const deg = (rad: number) => (rad * 180) / Math.PI;
    for (const gaze of Object.values(GAZE)) {
      const pose = headPose(gaze, rest);
      expect(deg(pose.angle)).toBeGreaterThanOrEqual(0);
      expect(deg(pose.angle)).toBeLessThan(3);
      expect(Math.abs(pose.dx)).toBeLessThan(0.02);
      expect(Math.abs(pose.dy)).toBeLessThan(0.02);
      const [ex, ey] = eyeShift(gaze, rest);
      expect(ex).toBeGreaterThanOrEqual(0);
      expect(ex).toBeLessThan(0.14);
      expect(Math.abs(ey)).toBeLessThan(0.05);
    }
    // To the right: the eyes glide right and the helmet leans that way; to the tools, the eyes drop too.
    expect(eyeShift(GAZE.llm, rest)[0]).toBeGreaterThan(0.1);
    expect(eyeShift(GAZE.tools, rest)[1]).toBeGreaterThan(eyeShift(GAZE.llm, rest)[1]);
    expect(headPose(GAZE.llm, rest).angle).toBeGreaterThan(headPose(GAZE.guardrails, rest).angle);
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

  it('glows like the photo: narrow on the reflection, round on the dark glass, fading to nothing', () => {
    expect(roundness(0.1, 0.12, 0.28)).toBe(0);
    expect(roundness(0.2, 0.12, 0.28)).toBeCloseTo(0.5);
    expect(roundness(0.4, 0.12, 0.28)).toBe(1);
    for (const round of [0, 0.5, 1]) {
      const stops = glowStops(round);
      expect(stops[0]?.[0]).toBe(0);
      expect(stops.at(-1)).toEqual([1, expect.stringMatching(/\/ 0\.000\)$/)]);
    }
    expect(glowStops(1)[0]?.[1]).toBe('rgb(147 215 255 / 0.765)');
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
    const rig = { ...HEAD.rig, gaze: GAZE, rest: GAZE_REST };
    expect(parseRig(JSON.stringify(rig))?.rest).toBe('user');
    expect(parseRig(undefined)).toBeUndefined();
    expect(parseRig('{')).toBeUndefined();
    expect(parseRig(JSON.stringify({ ...rig, rest: 'nobody' }))).toBeUndefined();
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
