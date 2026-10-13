import poseGuardrails from '../assets/hero/poses/robot-guardrails.webp';
import poseLlm from '../assets/hero/poses/robot-llm.webp';
import poseRag from '../assets/hero/poses/robot-rag.webp';
import poseTools from '../assets/hero/poses/robot-tools.webp';
import poseUser from '../assets/hero/poses/robot-user.webp';
import robotArt from '../assets/hero/robot-agent.png';
import type { FlowNodeId } from '../content/site';

/**
 * The hero robot (the LCP element). The <Picture> in AgentFlow and the <link rel="preload">
 * in <head> must request identical transforms so the browser reuses the preloaded file.
 *
 * Widths start at 360: the robot is drawn 223 CSS px wide inside the scaled flow stage, and
 * browsers/Lighthouse judge resolution against that untransformed size (x1.5 = 335 px).
 * Generated with Gemini 3 Pro Image on Vertex AI; prompts in scripts/generate-robot-art.py.
 */
export const robotImage = {
  src: robotArt,
  widths: [360, 540, 720],
  sizes: '(width >= 64rem) 235px, min(31vw, 180px)',
  quality: 72,
} as const;

/**
 * The robot turning to each participant (same artwork, aligned on one wider canvas by
 * scripts/cutout-robot.mjs). Not part of the first render: scripts/hero.ts loads them once
 * the page is idle and crossfades to the pose of whichever participant the agent is talking to.
 * The canvas is ~2x the base figure's width, so widths and sizes are ~2x the base image's.
 */
export const robotPoses = {
  images: {
    user: poseUser,
    llm: poseLlm,
    rag: poseRag,
    tools: poseTools,
    guardrails: poseGuardrails,
  } satisfies Record<Exclude<FlowNodeId, 'agent'>, ImageMetadata>,
  widths: [540, 720, 1080],
  sizes: '(width >= 64rem) 470px, min(62vw, 360px)',
  quality: 72,
} as const;
