import { describe, expect, it } from 'vitest';

import { hero } from '../../src/content/site';
import { AGENT_CORE, flowNodes, hops, NODE_RADIUS, ROBOT, spokes, STAGE } from '../../src/lib/hero-flow';
import { levelFor, parseHops } from '../../src/scripts/hero';

describe('hero flow layout', () => {
  it('numbers participants by first involvement, 1..n', () => {
    expect(flowNodes.map((n) => n.id)).toEqual(hero.nodes.map((n) => n.id));
    expect(flowNodes.map((n) => n.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('matches the robot box hard-coded in AgentFlow.astro CSS (.flow__robot)', () => {
    expect(ROBOT).toEqual({ x: 328.5, y: 15, width: 223, height: 690 });
  });

  it('keeps every bubble inside the stage and clear of the robot', () => {
    for (const node of flowNodes.filter((n) => n.id !== 'agent')) {
      expect(node.x - NODE_RADIUS).toBeGreaterThanOrEqual(0);
      expect(node.x + NODE_RADIUS).toBeLessThanOrEqual(STAGE.width);
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
  });

  it('parses hop data defensively', () => {
    expect(parseHops(undefined)).toEqual([]);
    expect(parseHops('not json')).toEqual([]);
    expect(parseHops('[{"spoke":"user","direction":"back","to":"agent","label":"request"}]')).toHaveLength(1);
  });
});
