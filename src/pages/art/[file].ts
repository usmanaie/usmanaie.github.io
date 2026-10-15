import type { APIRoute, GetStaticPaths } from 'astro';

import { agentPortraitSvg, PORTRAIT_VARIANTS, portraitSrc, type PortraitVariant } from '../../lib/agent-portrait';

/** One SVG file per portrait colourway: /art/agent-experience.svg and /art/agent-contact.svg. */
export const getStaticPaths = (() =>
  PORTRAIT_VARIANTS.map((variant) => ({
    params: { file: portraitSrc(variant).replace('/art/', '') },
    props: { variant },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ variant: PortraitVariant }> = ({ props }) =>
  new Response(agentPortraitSvg(props.variant), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
