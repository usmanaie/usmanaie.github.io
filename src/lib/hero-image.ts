import agent from '../assets/hero/agent.png';

/**
 * Shared options for the hero agent image (the LCP element). The <Picture> in the hero
 * and the <link rel="preload"> in <head> must request identical transforms so the
 * browser reuses the preloaded file.
 *
 * The supplied artwork is 379x598, smaller than its 498x785 design size, so it is served
 * at its native width (no upscaled "2x"). See DECISIONS.md.
 */
export const heroImage = {
  src: agent,
  width: agent.width,
  height: agent.height,
  quality: 82,
} as const;
