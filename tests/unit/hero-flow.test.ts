import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { hero } from '../../src/content/site';
import { AGENT_CORE, flowNodes, HEAD, hops, LOOK_AT, NODE_RADIUS, ROBOT, spokes, STAGE } from '../../src/lib/hero-flow';
import { easeInOut, headFillTop, headTintColor, levelFor, parseHops } from '../../src/scripts/hero';

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
    expect(css).toMatch(new RegExp(String.raw`mask-size:\s*100% 100%,\s*${width}px ${height}px;`));
    expect(css).toMatch(new RegExp(String.raw`mask-position:\s*0 0,\s*${x}px 0;`));
  });

  it('turns the head left for the USER (the static default) and right for the LLM and tools', () => {
    expect(LOOK_AT.user).toBe(HEAD.defaultFrame);
    expect(LOOK_AT.guardrails).toBeGreaterThan(LOOK_AT.user);
    expect(LOOK_AT.guardrails).toBeLessThan(LOOK_AT.llm);
    expect(LOOK_AT.llm).toBe(HEAD.frames - 1);
    expect(LOOK_AT.rag).toBe(LOOK_AT.llm);
    expect(LOOK_AT.tools).toBe(LOOK_AT.llm);
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

  it('parses hop data defensively', () => {
    expect(parseHops(undefined)).toEqual([]);
    expect(parseHops('not json')).toEqual([]);
    expect(parseHops('[{"spoke":"user","direction":"back","to":"agent","label":"request"}]')).toHaveLength(1);
  });
});
