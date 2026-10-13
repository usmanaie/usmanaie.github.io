import robotLayout from '../assets/hero/robot-layout.json';
import { type FlowNodeId, hero } from '../content/site';

/**
 * Layout of the hero's agent loop, in the 880x720 (landscape) stage coordinate system.
 *
 * Hub and spoke: the agent (the robot's chest core) is the only participant that talks to
 * the others, so every message travels along a spoke between the agent and one node.
 * One source for node positions, spoke paths and the hop sequence.
 */
export const STAGE = { width: 880, height: 720 } as const;
export const NODE_RADIUS = 40;

export interface Point {
  x: number;
  y: number;
}

/**
 * Where the robot artwork sits in the stage. The base cut-out (robot-layout.json `figure`,
 * 773x2394) fills the stage height and is centred. CORE is the glowing chest core, as a
 * fraction of the artwork.
 */
const ROBOT_HEIGHT = 690;
const { figure, canvas } = robotLayout;
const ROBOT_WIDTH = Math.round((ROBOT_HEIGHT * figure.width) / figure.height);
export const ROBOT = { x: (STAGE.width - ROBOT_WIDTH) / 2, y: 15, width: ROBOT_WIDTH, height: ROBOT_HEIGHT } as const;

/**
 * The pose canvas (scripts/cutout-robot.mjs aligns every pose on it) relative to the robot
 * box, in stage px: wider than the base figure because arms reach out towards the bubbles.
 */
const k = ROBOT_HEIGHT / figure.height;
const round2 = (v: number) => Math.round(v * 100) / 100;
export const POSE_CANVAS = {
  x: round2(-figure.left * k),
  y: round2(-figure.top * k),
  width: round2(canvas.width * k),
  height: round2(canvas.height * k),
} as const;
const CORE = { x: 0.589, y: 0.332 };

export const AGENT_CORE: Point = {
  x: Math.round(ROBOT.x + CORE.x * ROBOT.width),
  y: Math.round(ROBOT.y + CORE.y * ROBOT.height),
};

const POSITIONS: Record<FlowNodeId, Point> = {
  user: { x: 90, y: 150 },
  agent: AGENT_CORE,
  llm: { x: 800, y: 150 },
  rag: { x: 826, y: 382 },
  tools: { x: 790, y: 600 },
  // Left-middle, so the lower-left stays clear for the trust badge beside the CTA.
  guardrails: { x: 96, y: 410 },
};

/** How far each spoke bows away from the straight line (fraction of its length). */
const BOW: Record<Exclude<FlowNodeId, 'agent'>, number> = {
  user: 0.16,
  llm: -0.16,
  rag: 0.12,
  tools: 0.14,
  guardrails: -0.14,
};

export interface FlowNode {
  id: FlowNodeId;
  step: number;
  label: string;
  tone: 'blue' | 'red';
  x: number;
  y: number;
}

export const flowNodes: FlowNode[] = hero.nodes.map((n, i) => ({ ...n, step: i + 1, ...POSITIONS[n.id] }));

export interface Spoke {
  id: Exclude<FlowNodeId, 'agent'>;
  tone: 'blue' | 'red';
  /** Path from the agent out to the node, and the same curve reversed. */
  out: string;
  back: string;
  /** Direction of the spoke's first use, so it is drawn in that direction. */
  firstDirection: 'out' | 'back';
}

function spokePaths(to: Point, bow: number): { out: string; back: string } {
  const from = AGENT_CORE;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Control point: the midpoint pushed sideways (perpendicular) by `bow` of the length.
  const cx = Math.round(mx - dy * bow);
  const cy = Math.round(my + dx * bow);
  return {
    out: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
    back: `M ${to.x} ${to.y} Q ${cx} ${cy} ${from.x} ${from.y}`,
  };
}

export const spokes: Spoke[] = flowNodes
  .filter((n): n is FlowNode & { id: Spoke['id'] } => n.id !== 'agent')
  .map((n) => {
    const first = hero.hops.find((h) => h.from === n.id || h.to === n.id);
    return {
      id: n.id,
      tone: n.tone,
      ...spokePaths(n, BOW[n.id]),
      firstDirection: first?.to === 'agent' ? 'back' : 'out',
    };
  });

export interface Hop {
  /** The spoke this hop travels and in which direction. */
  spoke: Spoke['id'];
  direction: 'out' | 'back';
  /** Node that receives the message (revealed and highlighted on arrival). */
  to: FlowNodeId;
  label: string;
  text: string;
  /** Guardrails approved the answer: the robot's charge turns green from here on. */
  approves: boolean;
}

/**
 * Every hop is agent <-> one node; anything else would mean a non-agent calling another
 * directly. The content type already rules that out; the runtime check guards future edits.
 */
export const hops: Hop[] = hero.hops.map((h) => {
  const { from, to } = h as { from: FlowNodeId; to: FlowNodeId };
  if (from !== 'agent' && to !== 'agent') {
    throw new Error(`Invalid hop ${from} -> ${to}: every message must go through the agent`);
  }
  const outward = h.from === 'agent';
  const other = (outward ? h.to : h.from) as Spoke['id'];
  return {
    spoke: other,
    direction: outward ? 'out' : 'back',
    to: h.to,
    label: h.label,
    text: h.text,
    approves: 'approves' in h && h.approves === true,
  };
});
