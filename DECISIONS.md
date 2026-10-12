# Decisions and deviations

Every deviation from the design export or the build brief, and every assumption, with the reasoning.
Owner-facing items are also tracked in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Stack

| Decision                                                                       | Reasoning                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Astro 7.3 (static output), TypeScript strict (`astro/tsconfigs/strictest`)** | The brief's recommendation. A content site with three tiny interactive pieces; Astro ships zero JS by default. First-load JS is **1.5 KB (Brotli)** against a 30 KB budget.                                                                                                   |
| **No client islands / no framework runtime**                                   | Header, mobile menu, scroll-spy, carousel buttons and hero controls are small vanilla TS modules bundled by Astro. No component needed a framework.                                                                                                                           |
| **Plain CSS + custom-property tokens + Astro scoped styles**                   | No Tailwind, no CSS-in-JS, no UI libraries. All design values live in `src/styles/tokens.css`.                                                                                                                                                                                |
| **Typed TS modules in `src/content/*.ts`** (not Astro content collections)     | The content is small, structured and partly derived (years of experience, copyright year). Typed modules give compile-time checking without a schema layer.                                                                                                                   |
| **pnpm 12.11, Node 22.19 (pinned in `.nvmrc`, `engines`, `packageManager`)**   | Node 22 is the LTS installed on the owner's machine and is supported until April 2027. Moving to Node 24 LTS is a one-line change.                                                                                                                                            |
| **TypeScript 6.0 and ESLint 10**                                               | TypeScript 7 (the native port) is not yet supported by `@astrojs/check` or `typescript-eslint`. `eslint-plugin-astro` 3 requires ESLint 10; `eslint-plugin-jsx-a11y` declares a peer range up to 9 but works with 10, so that peer range is allowed in `pnpm-workspace.yaml`. |
| **Firebase Hosting** with GitHub Actions + Workload Identity Federation        | Global CDN, automatic TLS, Brotli, HTTP/2+, header control and per-PR preview channels. No long-lived keys: deploy jobs authenticate via OIDC.                                                                                                                                |

## Structural additions and changes

1. **Sticky compact header (the approved addition).** The design has navigation only inside the hero. On desktop
   home the header stays hidden while the hero nav is visible, then slides in. On sub-pages and below 1024px it
   is always shown. Scroll-spy (IntersectionObserver) drives `aria-current="location"` on every nav. It never
   writes `location.hash`. Landmarks are labelled `Primary` (hero), `Site` (header), `Mobile` (menu) and `Footer`.
2. **Mobile disclosure menu.** It has `aria-expanded`/`aria-controls`, a focus trap including the toggle, and
   closes on Escape or on link click. The page behind is made `inert`, and scroll is locked with scrollbar-width
   compensation so nothing shifts.
3. **Reviews gated off** (`reviews.enabled = false`, no items). The design only has placeholder quotes. The
   section and its nav/footer links render only when real items exist. The component is fully built and tested
   against a **test-only fixture build** (`PUBLIC_REVIEWS_FIXTURE=true` → `dist-fixture/`, `noindex`). The fixture
   mirrors the design placeholders and is never deployed: `check-dist` and the deploy job reject placeholder text.
4. **Case study pages** (`/projects/<slug>`) and a **`/projects` index** replace the dead `#projects` links. They
   use only content already in the design (summary, highlights, illustration) plus a contact CTA. No case-study
   details were invented.
5. **Privacy and Terms pages** (`/privacy`, `/terms`) replace `#privacy`/`#terms`. The draft copy describes a
   static, cookie-free, mailto-only site on Firebase Hosting. It is not legal advice and needs owner sign-off.
6. **Custom 404**, `robots.txt`, `sitemap.xml`, favicon set, web manifest and a 1200×630 share image.
7. **Footer moved outside `<main>`** for correct landmarks. The Contact colour field extends behind it so the
   design's continuous background is preserved.

## Content fixes (brief §13)

| Issue                                                                                           | Resolution                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job title inconsistency ("Lead AI Engineer" in `<title>`, "Lead Software Engineer" on the page) | Defaulted to **Lead Software Engineer** everywhere (title, tagline, JSON-LD `jobTitle`) from one field, `site.jobTitle`. **Flagged:** the owner's own introduction used "Lead AI Engineer", so this needs their decision.                                      |
| Typo "Lets Build Something"                                                                     | Fixed to "Let's Build Something" (typographic apostrophe). `check-dist` rejects the typo.                                                                                                                                                                      |
| Claims to confirm                                                                               | Copied verbatim and marked `OWNER-CONFIRM` in `src/content`. "4+ years" and "Four years" both derive from `CAREER_START` (May 2022).                                                                                                                           |
| Duplicate SVG ids (`av-g` ×5, repeated gradient/filter ids)                                     | Every inline SVG id is namespaced (`hero-*`, `agent-<variant>-*`, `ring-<variant>-path`). The reviewer avatar is one `<symbol>` used via `<use>`. An e2e test asserts there are no duplicate ids.                                                              |
| "SCROLL DOWN" / "CONTACT US" ring text overlapping itself ("SCRSCROLL")                         | The design repeats the phrase three times, which is longer than the circle, so the ends collide. Now two repetitions spread around the full circumference with `textLength` + `lengthAdjust="spacing"`. Only letter spacing changes; glyphs are not distorted. |
| Email harvesting                                                                                | `mailto:` is percent-encoded at build time (`src/lib/email.ts`). It works without JavaScript, and the address never appears in plain text in the HTML.                                                                                                         |

## Fidelity decisions

- **Hero ≥ 1024px.** The 1600×1067 composition is kept and scaled by one unitless factor,
  `--hero-scale: tan(atan2(min(100cqw, 1440px), 1600px))`. That is a CSS-only length ratio, so orbs, connectors and
  `offset-path` objects stay aligned with no JavaScript. Above 1440px the composition is centred at its 1440 size,
  and the colour fields extend full-bleed. **Below 1024px** the copy re-flows: headline, then subhead and CTA,
  then trust badge, then the agent illustration as its own scaled 880×900 canvas. Orb names are counter-scaled to
  stay legible, and captions are dropped below 640px.
- **Headline.** Real `<h1>` text, with no SVG and no `textLength`. The design squeezed League Gothic to 70–79% of
  its natural width. I used the font's own **width axis** (`font-stretch: 81%`, variable font with `wdth`
  75–100) plus 10px word spacing, which reproduces the proportions without distorting glyphs.
- **Exact positions are reproduced with grids, not absolute coordinates.** Columns use `fr` units matching the
  1440 artboard, e.g. About `589fr 99fr 512fr` and Projects `600fr 66fr 534fr`. So the layout is exact at 1440 and
  scales between 1024 and 1440. Decorative layers (portraits, big background words, ring) are absolutely
  positioned relative to the page centre so they stay put above 1440.
- **Project illustrations** were rendered from the mockup's `.shot` DOM at 2× with Playwright
  (`scripts/render-design-assets.mjs`) and shipped as AVIF/WebP with descriptive alt text, instead of porting
  hundreds of decorative `<div>`s.
- **Pill widths.** The design's pills have hand-set widths (109–178px). I used uniform padding (24px; compact
  19px for VIEW ALL), and every pill is at least **44px tall** (the design had 42–43px).

### Fidelity results at 1440px (`pnpm fidelity`, pixelmatch threshold 0.1)

| Section           | Mismatch | Notes                                                                                                                                                                                                             |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero              | 3.5%     | Glyph anti-aliasing (my subset WOFF2 vs Google-hosted fonts), condensed-axis vs squeezed headline glyphs, the hidden Reviews nav link.                                                                            |
| About             | 3.0%     | Text anti-aliasing; ring text now evenly spaced (design bug fix).                                                                                                                                                 |
| Education         | 2.5%     | Text anti-aliasing.                                                                                                                                                                                               |
| Expertise         | 0.6%     |                                                                                                                                                                                                                   |
| Projects          | 12.6%    | **27% inside the three illustrations** (fine noise textures re-encoded to AVIF from 2× renders), **4.4% elsewhere** (text anti-aliasing, row 1 copy ±5px, since the design's rows are not internally consistent). |
| Experience        | 1.5%     |                                                                                                                                                                                                                   |
| Reviews (fixture) | 3.4%     |                                                                                                                                                                                                                   |
| Contact + footer  | 2.3%     |                                                                                                                                                                                                                   |

Accepted exceptions: font rasterisation differences, lossy re-encoding of noisy illustrations, the evenly
spaced ring text, and intentional content fixes. The CI visual-regression suite uses approved baselines of the
build itself (Linux, generated by the `update_baselines` workflow input). It does not compare against the
Windows-rendered design references, which would fail on font rendering alone.

## Accessibility decisions and contrast changes

All token changes are minimal and documented in `tokens.css`:

| Token                             | Design                  | Shipped             | Why                                                                                                |
| --------------------------------- | ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `--gradient-date-pill`            | `#3A7FD6 → #E0566C`     | `#3675C6 → #C44B5E` | 9.5px bold white text was 3.7–4.1:1; now ≥ 4.65:1 across the gradient.                             |
| `--gradient-stat-accent` end stop | `#3F89A6`               | `#397D97`           | The white label at the bottom of the accent stat cells was 3.6:1; now 4.6:1 (label alpha .92 → 1). |
| `--color-eyebrow-blue`            | `#3A7FD6`               | `#4C8BDA`           | 4.0:1 over the red Projects colour field; now 4.6:1.                                               |
| `--color-ring-text`               | `#D4566C`               | `#D76276`           | 4.2:1 over the About red glow; now 4.6:1.                                                          |
| Reviewer role                     | `rgba(230,233,240,.70)` | `.75`               | Headroom over the 4.5:1 minimum at 11px.                                                           |

- `role="list"` is kept on unstyled lists because Safari/VoiceOver drops list semantics with
  `list-style: none`. The redundant-role lint rule is configured to allow it.
- The reviews track is a focusable scrollable region (`tabindex="0"`, `role="region"`), as axe's
  `scrollable-region-focusable` requires.
- "View case study" links get a full `aria-label` ("View case study: Multi-Agent AI Platform") that starts with
  the visible text (WCAG 2.5.3). A visually hidden suffix was tried first, but browsers insert a space before an
  absolutely positioned span.
- Colour scheme is dark-only (`color-scheme: dark`). Gradient-border pills fall back to a `LinkText` border
  under `forced-colors`.

## Performance decisions

- **Fonts**: six subset WOFF2 files, **70 KB total**, self-hosted, `font-display: swap`. Only League Gothic and
  Manrope (above the fold) are preloaded. Capsize-generated metric-adjusted fallbacks prevent layout shift.
  Weights are restricted to those used: Hanken 200–600 + 300 italic, Manrope 300–700.
- **Hero image (LCP).** AVIF/WebP/PNG via `<picture>`, preloaded with `fetchpriority="high"`, never lazy.
  - The supplied art is **379×598, below its 498×785 display size**. Lighthouse expects ≥ 1.5× resolution
    (a Best Practices failure otherwise), so `pnpm images` serves an **interim Lanczos 2× upscale** (758×1196,
    53 KB AVIF).
  - This is documented in `scripts/build-images.mjs`. Replacing `agent.png` with real high-resolution art is
    launch item 13.
  - The fluid-fill mask is a 15 KB alpha-only WebP derived from the same source, so mask and image always match.
- **Hero animation.** Keyframes are ported verbatim, plus these optimisations:
  - Connector blur filters use the default object-bounding-box filter region instead of the design's full
    1600×1067 region.
  - Flying objects use `offset-path` with pre-translated paths.
  - Everything pauses via `animation-play-state` when off-screen (IntersectionObserver) or when the tab is hidden.
  - The `--lv` fill level animates a registered `@property` (main-thread style work on a small subtree). That is
    the "unavoidable" exception the brief allows.
- **First render.** These are the measured fixes that brought mobile LCP from 2.7s to 1.96s under Lighthouse's
  simulated throttling:
  - **One stylesheet per page** (`cssCodeSplit: false`). Astro emitted 4–5 render-blocking files, each costing
    ~300ms of simulated round-trip.
  - **`content-visibility: auto` on below-the-fold sections until the page is idle.** Then `data-ready` switches
    it off so in-page anchors land exactly. Leaving it on made anchor jumps land short as sections expanded.
  - **The hero's masked fill layers, edge tint and power glows are skipped until the intro starts** after load.
    They are the costliest paints and are invisible or faint at the start of the cycle; the tint fades in. The
    cycle itself also starts after load + idle, from 0%.
  - **Expertise ring layers as AVIF q55–60** (209 KB → 83 KB at phone sizes), and the first `/projects`
    illustration loads eagerly with high priority.
- **Reduced motion** shows a designed static end-state frame: agent filled, orbs lit, connectors drawn, flyers
  and particles hidden. It is not a frozen first frame.
- **Expertise ring.** The 40/14/5px SVG blur filters are pre-rendered into two image layers (glow, rings). Only
  the tick marks rotate, as a transformed `<img>`, and the glow layer animates opacity. Both pause off-screen.
- **Graceful degradation.** Without `offset-path`, the flyers are hidden. Without `mask-composite`, the fill
  overlays are hidden. Without `@property`, the fill steps instead of tweening. In every case the layout is intact.
- **Lighthouse CI, local, mobile, simulated throttling** (median of 3):

  | Page                                | Perf | A11y | BP  | SEO | LCP   | CLS | TBT  | Transfer |
  | ----------------------------------- | ---- | ---- | --- | --- | ----- | --- | ---- | -------- |
  | `/`                                 | 0.99 | 1    | 1   | 1   | 1.96s | 0   | 0 ms | 265 KB   |
  | `/projects`                         | 0.99 | 1    | 1   | 1   | 1.74s | 0   | 0 ms | 150 KB   |
  | `/projects/multi-agent-ai-platform` | 0.99 | 1    | 1   | 1   | 1.96s | 0   | 0 ms | 159 KB   |
  | `/privacy`                          | 1    | 1    | 1   | 1   | 1.50s | 0   | 0 ms | 83 KB    |

  Home and case-study LCP sit only ~40ms under the 2.0s budget in simulation, so watch CI. A real
  high-resolution hero (smaller than the upscale at equal quality) or inlined critical CSS (would need per-build
  CSP hashes) are the next levers.

- **Not yet done on real hardware:** DevTools throttled-CPU profiling on a mid-range phone and real-device
  WebPageTest runs. These are launch-checklist items.

## Security decisions

- Strict header CSP in `firebase.json`: `script-src 'self'; style-src 'self'`, no `unsafe-inline`.
  - The build emits **no inline scripts, inline styles or `style=""` attributes** (`inlineStylesheets: 'never'`,
    `assetsInlineLimit: 0`). `check-dist` enforces this.
  - JSON-LD is a non-executable data block.
  - Astro's built-in CSP was not used because it only emits a `<meta>` tag, which cannot carry `frame-ancestors`.
- HSTS (preload-ready), nosniff, strict referrer policy, deny-all Permissions-Policy, COOP/CORP same-origin and
  `X-Frame-Options: DENY`.
- The local preview server (`scripts/serve.mjs`) applies the same headers, so e2e tests catch CSP violations.
- No cookies, analytics, trackers or third-party requests. An e2e test asserts the site makes requests to one
  origin only.

## Tooling notes

- **Local test environment.** On the development machine, Windows application control blocks the downloaded
  Firefox and full Chrome binaries ("Permission denied"), so locally:
  - Firefox runs only in CI (Linux).
  - Lighthouse uses Playwright's `chrome-headless-shell`
    (`CHROME_PATH=…/chromium_headless_shell-*/…/chrome-headless-shell.exe pnpm lhci`).
  - WebKit runs at 1× DPR, because Playwright's Windows WebKit never reports transformed elements as "stable"
    after scrolling at 2×.
  - In WebKit, the skip-link test focuses the link directly: like Safari's default, WebKit doesn't tab to links.
- `scripts/serve.mjs` drops only `upgrade-insecure-requests` from the CSP when serving plain-http localhost
  (WebKit would otherwise upgrade every asset to https and fail). Production is HTTPS-only, where it's a no-op.

- `scripts/prune-dist.mjs` removes two unreferenced build artefacts: the original hero PNG (only its
  derivatives are used) and the compiled-but-unrendered Reviews script.
- Linux visual baselines can't be generated on the Windows development machine. Run the CI workflow manually
  with `update_baselines: true`, review the uploaded screenshots, and commit them to
  `tests/visual/__screenshots__/linux/`.
- Illustration colours (agent portraits, orb icons, flyers) are artwork data inside the illustration components,
  not UI tokens.
