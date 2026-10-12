// @ts-check
import { defineConfig } from 'astro/config';

/**
 * The production origin comes from SITE_URL (set by the deploy workflow).
 * It drives canonical URLs, the sitemap and Open Graph URLs.
 */
const site = process.env.SITE_URL ?? 'http://localhost:4321';

/** Test-only build with placeholder reviews (see src/content/reviews-source.ts). */
const fixture = process.env.PUBLIC_REVIEWS_FIXTURE === 'true';

export default defineConfig({
  site,
  output: 'static',
  outDir: fixture ? './dist-fixture' : './dist',
  trailingSlash: 'never',
  compressHTML: true,
  devToolbar: { enabled: false },
  build: {
    format: 'file',
    assets: '_astro',
    // External, hashed stylesheets only: keeps the CSP free of 'unsafe-inline'.
    inlineStylesheets: 'never',
  },
  image: {
    responsiveStyles: false,
  },
  vite: {
    build: {
      // Never inline assets as data: URIs; they would bypass caching and the CSP.
      assetsInlineLimit: 0,
    },
  },
});
