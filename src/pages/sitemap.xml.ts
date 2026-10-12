import type { APIRoute } from 'astro';

import { projects } from '../content/projects';
import { BUILD_DATE } from '../content/site';

/** Every indexable page. The 404 page and the test-only fixture build are excluded. */
const PATHS = ['/', '/projects', ...projects.map((p) => `/projects/${p.slug}`), '/privacy', '/terms'];

export const GET: APIRoute = ({ site }) => {
  const lastmod = BUILD_DATE.toISOString().slice(0, 10);
  const urls = PATHS.map((p) => `  <url><loc>${new URL(p, site).href}</loc><lastmod>${lastmod}</lastmod></url>`).join(
    '\n',
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
