import robotArt from '../assets/hero/robot-agent.png';

/**
 * The hero robot (the LCP element). The <Picture> in AgentFlow and the <link rel="preload">
 * in <head> must request identical transforms so the browser reuses the preloaded file.
 *
 * The robot is laid out 343 CSS px wide inside the scaled flow stage (ROBOT in hero-flow.ts),
 * and Lighthouse judges resolution against that untransformed size (x1.5 = 515 px), so `sizes`
 * steers phones (DPR ~1.75-3) to the 540 or 720 file rather than the visually scaled width.
 * Generated with Gemini 3 Pro Image on Vertex AI; prompts in scripts/generate-robot-art.py.
 */
export const robotImage = {
  src: robotArt,
  widths: [360, 540, 720],
  sizes: '(width >= 64rem) 343px, 300px',
  quality: 56,
} as const;
