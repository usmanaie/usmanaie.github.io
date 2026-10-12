import agent from '../assets/hero/agent-2x.png';

/**
 * Shared options for the hero agent image (the LCP element). The <Picture> in the hero
 * and the <link rel="preload"> in <head> must request identical transforms so the
 * browser reuses the preloaded file.
 *
 * The supplied artwork is 379x598, below its 498x785 design size, so an interim Lanczos 2x
 * upscale is served until a real high-resolution source exists (scripts/build-images.mjs).
 * Displayed at 498x785 in the hero canvas; intrinsic size 758x1196.
 */
export const heroImage = {
  src: agent,
  width: agent.width,
  height: agent.height,
  quality: 62,
} as const;
