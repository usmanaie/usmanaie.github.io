import robotHead from '../assets/hero/robot-head.json';
import { type FlowNodeId, hero } from '../content/site';

/**
 * Layout of the hero's agent loop, in the 720x880 (portrait) stage coordinate system. The robot
 * is larger than the stage and runs off its bottom edge (cropped at the shins), so it carries
 * the visual weight of a portrait opposite the headline.
 *
 * Hub and spoke: the agent (the robot's chest core) is the only participant that talks to
 * the others, so every message travels along a spoke between the agent and one node.
 * One source for node positions, spoke paths and the hop sequence.
 */
export const STAGE = { width: 720, height: 880 } as const;
export const NODE_RADIUS = 40;

export interface Point {
  x: number;
  y: number;
}

/**
 * Where the robot artwork sits in the stage. The cut-out (robot-head.json width x height,
 * built by scripts/build-robot-head.mjs, already trimmed just below the knees) runs past the
 * stage's bottom edge, which crops it at the shins. CORE is the glowing chest core, as a
 * fraction of the artwork.
 */
const ROBOT_HEIGHT = 875;
const ROBOT_WIDTH = Math.round((ROBOT_HEIGHT * robotHead.width) / robotHead.height);
/** Right of centre, so the CTA row under the copy ends clear of the robot's legs. */
const ROBOT_SHIFT = 60;
export const ROBOT = {
  x: (STAGE.width - ROBOT_WIDTH) / 2 + ROBOT_SHIFT,
  y: 10,
  width: ROBOT_WIDTH,
  height: ROBOT_HEIGHT,
} as const;
const CORE = { x: 0.584, y: 0.376 };

/**
 * The robot's turning head: frames in the sprite run from facing the viewer's left (the USER
 * bubble) through front to the right. `keys` are the frame indices of the generated angles
 * (3/4 left, slight left, front, slight right, 3/4 right); the rest are morphed in-betweens.
 * BOX is where the sprite is drawn (and the photo masked), in px within the robot box: the
 * band above the collar, cropped to the columns that change between frames.
 */
const round2 = (v: number) => Math.round(v * 100) / 100;
export const HEAD = {
  frames: robotHead.frames,
  defaultFrame: robotHead.default,
  /** The head band's height as a fraction of the robot box (the charge fill reaches it last). */
  seam: robotHead.seam,
  box: {
    x: round2(robotHead.headLeft * ROBOT.width),
    width: round2(robotHead.headWidth * ROBOT.width),
    height: round2(robotHead.seam * ROBOT.height),
  },
} as const;

const [LEFT = 0, SLIGHT_LEFT = 0, , , RIGHT = 0] = robotHead.keys;
/** Which way the robot looks while talking to each participant (a frame index). */
export const LOOK_AT: Record<Exclude<FlowNodeId, 'agent'>, number> = {
  user: LEFT,
  guardrails: SLIGHT_LEFT,
  llm: RIGHT,
  rag: RIGHT,
  tools: RIGHT,
};

export const AGENT_CORE: Point = {
  x: Math.round(ROBOT.x + CORE.x * ROBOT.width),
  y: Math.round(ROBOT.y + CORE.y * ROBOT.height),
};

const POSITIONS: Record<FlowNodeId, Point> = {
  user: { x: 84, y: 200 },
  agent: AGENT_CORE,
  // The right-hand bubbles overhang the stage a little (into the page gutter) for breathing room.
  llm: { x: 666, y: 200 },
  rag: { x: 694, y: 440 },
  tools: { x: 662, y: 680 },
  guardrails: { x: 90, y: 500 },
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
