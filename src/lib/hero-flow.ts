import { type FlowStepId, hero } from '../content/site';
import { closedSpline, loopPath, type Point, segmentPath, stopDistances } from './flow-path';

/**
 * Layout of the hero's agent flow, in the 720x720 stage coordinate system.
 * One source for node positions, the connector segments and the token's stop distances.
 */
export const STAGE = 720;
export const NODE_RADIUS = 40;

/**
 * Where the robot artwork sits in the stage. The cut-out is 773x2394; it fills the stage
 * height and is centred. CORE is the glowing chest core, as a fraction of the artwork.
 */
const ROBOT_HEIGHT = 690;
const ROBOT_WIDTH = Math.round((ROBOT_HEIGHT * 773) / 2394);
export const ROBOT = { x: (STAGE - ROBOT_WIDTH) / 2, y: 15, width: ROBOT_WIDTH, height: ROBOT_HEIGHT } as const;
const CORE = { x: 0.589, y: 0.332 };

/** The AGENT step is the robot's chest core. */
const AGENT_CORE: Point = {
  x: Math.round(ROBOT.x + CORE.x * ROBOT.width),
  y: Math.round(ROBOT.y + CORE.y * ROBOT.height),
};

/** The AGENT label tag floats beside the robot's head. */
export const AGENT_TAG = { x: 540, y: 52 } as const;

const POSITIONS: Record<FlowStepId, Point> = {
  user: { x: 104, y: 150 },
  agent: AGENT_CORE,
  llm: { x: 630, y: 150 },
  rag: { x: 650, y: 380 },
  tools: { x: 600, y: 604 },
  guardrails: { x: 124, y: 604 },
  response: { x: 92, y: 380 },
};

export interface FlowNode {
  id: FlowStepId;
  step: number;
  label: string;
  caption: string;
  tone: 'blue' | 'red';
  x: number;
  y: number;
}

export const flowNodes: FlowNode[] = hero.flow.map((s, i) => ({ ...s, step: i + 1, ...POSITIONS[s.id] }));

const segments = closedSpline(flowNodes.map(({ x, y }) => ({ x, y })));

/** Connector i joins step i+1 to step i+2; the last one closes the loop back to the user. */
export const flowSegments = segments.map(segmentPath);
export const flowLoop = loopPath(segments);
/** offset-distance (%) of each step along the loop, for the travelling agent token. */
export const flowStops = stopDistances(segments);
