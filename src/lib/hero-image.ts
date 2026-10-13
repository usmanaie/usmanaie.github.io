import robotArt from '../assets/hero/robot-agent.png';

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
