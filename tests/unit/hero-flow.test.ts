import { describe, expect, it } from 'vitest';

import { hero } from '../../src/content/site';
import { flowNodes, flowSegments, flowStops, NODE_RADIUS, ROBOT, STAGE } from '../../src/lib/hero-flow';
import { levelFor } from '../../src/scripts/hero';

describe('hero flow layout', () => {
  it('has one node per content step, in order, numbered 1..n', () => {
    expect(flowNodes.map((n) => n.id)).toEqual(hero.flow.map((s) => s.id));
    expect(flowNodes.map((n) => n.step)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('closes the loop: one connector per step and an increasing stop per step', () => {
    expect(flowSegments).toHaveLength(flowNodes.length);
    expect(flowStops).toHaveLength(flowNodes.length);
    for (let i = 1; i < flowStops.length; i += 1) expect(flowStops[i]!).toBeGreaterThan(flowStops[i - 1]!);
  });

  it('matches the robot box hard-coded in AgentFlow.astro CSS (.flow__robot)', () => {
    expect(ROBOT).toEqual({ x: 248.5, y: 15, width: 223, height: 690 });
  });

  it('keeps every bubble inside the stage and clear of the robot', () => {
    for (const node of flowNodes.filter((n) => n.id !== 'agent')) {
      expect(node.x - NODE_RADIUS).toBeGreaterThanOrEqual(0);
      expect(node.x + NODE_RADIUS).toBeLessThanOrEqual(STAGE);
      const insideRobotX = node.x + NODE_RADIUS > ROBOT.x + 30 && node.x - NODE_RADIUS < ROBOT.x + ROBOT.width - 30;
      const insideRobotY = node.y + NODE_RADIUS > ROBOT.y && node.y - NODE_RADIUS < ROBOT.y + ROBOT.height;
      expect(insideRobotX && insideRobotY).toBe(false);
    }
  });
});

describe('levelFor', () => {
  it('maps visited steps to a 0-1 energy level and clamps', () => {
    expect(levelFor(0, 7)).toBe(0);
    expect(levelFor(7, 7)).toBe(1);
    expect(levelFor(9, 7)).toBe(1);
    expect(levelFor(1, 0)).toBe(0);
  });
});
