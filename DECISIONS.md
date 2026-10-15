# Decisions and deviations

Every deviation from the design export or the build brief, and every assumption, with the reasoning.
Owner-facing items are also tracked in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Stack

| Decision                                                                       | Reasoning                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Astro 7.3 (static output), TypeScript strict (`astro/tsconfigs/strictest`)** | The brief's recommendation. A content site with three tiny interactive pieces; Astro ships zero JS by default. First-load JS is **about 5 KB (Brotli)** against a 30 KB budget.                                                                                               |
| **No client islands / no framework runtime**                                   | Header, mobile menu, scroll-spy, carousel buttons and hero controls are small vanilla TS modules bundled by Astro. No component needed a framework.                                                                                                                           |
| **Plain CSS + custom-property tokens + Astro scoped styles**                   | No Tailwind, no CSS-in-JS, no UI libraries. All design values live in `src/styles/tokens.css`.                                                                                                                                                                                |
| **Typed TS modules in `src/content/*.ts`** (not Astro content collections)     | The content is small, structured and partly derived (years of experience, copyright year). Typed modules give compile-time checking without a schema layer.                                                                                                                   |
| **pnpm 12.11, Node 22.19 (pinned in `.nvmrc`, `engines`, `packageManager`)**   | Node 22 is the LTS installed on the owner's machine and is supported until April 2027. Moving to Node 24 LTS is a one-line change.                                                                                                                                            |
| **TypeScript 6.0 and ESLint 10**                                               | TypeScript 7 (the native port) is not yet supported by `@astrojs/check` or `typescript-eslint`. `eslint-plugin-astro` 3 requires ESLint 10; `eslint-plugin-jsx-a11y` declares a peer range up to 9 but works with 10, so that peer range is allowed in `pnpm-workspace.yaml`. |
| **GitHub Pages** (live), **Firebase Hosting** ready as the upgrade             | Pages is free and deploys from CI with no keys, but cannot send response headers (see Security). The Firebase setup (GitHub Actions + Workload Identity Federation) adds header control and per-PR preview channels; it takes over once `FIREBASE_PROJECT_ID` is set.         |

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
   static, cookie-free site on GitHub Pages, contacted by email, phone or LinkedIn. It is not legal advice and needs owner sign-off.
6. **Custom 404**, `robots.txt`, `sitemap.xml`, favicon set, web manifest and a 1200×630 share image.
7. **Footer moved outside `<main>`** for correct landmarks. The Contact colour field extends behind it so the
   design's continuous background is preserved.

## Content fixes (brief §13)

| Issue                                                                                           | Resolution                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job title inconsistency ("Lead AI Engineer" in `<title>`, "Lead Software Engineer" on the page) | **Lead AI Engineer** everywhere (title, tagline, About intro, JSON-LD `jobTitle`, web manifest) from one field, `site.jobTitle`, confirmed by the owner (matches LinkedIn). Past roles keep their own titles in Experience.                                    |
| Typo "Lets Build Something"                                                                     | Fixed to "Let's Build Something" (typographic apostrophe). `check-dist` rejects the typo.                                                                                                                                                                      |
| Claims to confirm                                                                               | Copied verbatim and marked `OWNER-CONFIRM` in `src/content`. "4+ years" and "Four years" both derive from `CAREER_START` (May 2022).                                                                                                                           |
| Duplicate SVG ids (`av-g` ×5, repeated gradient/filter ids)                                     | Every inline SVG id is namespaced (`flow-*`, `trust-ring-*`, `cert-ring-*`, `ring-<variant>-path`). The reviewer avatar is one `<symbol>` used via `<use>`. An e2e test asserts there are no duplicate ids.                                                    |
| "SCROLL DOWN" / "CONTACT US" ring text overlapping itself ("SCRSCROLL")                         | The design repeats the phrase three times, which is longer than the circle, so the ends collide. Now two repetitions spread around the full circumference with `textLength` + `lengthAdjust="spacing"`. Only letter spacing changes; glyphs are not distorted. |
| Email harvesting                                                                                | `mailto:` is percent-encoded at build time (`src/lib/email.ts`). It works without JavaScript, and the address never appears in plain text in the HTML.                                                                                                         |

## Fidelity decisions

- **Hero redesign (owner request, 2026-10-13).** The design's single scaled 1600×1067 canvas is replaced by a
  **two-column grid** (copy | agent flow) that fills the window (`min-height: 100svh`; the design-unit scaling
  under "Hero type scale" keeps the whole hero inside it).
  - **The card container is removed.** The overlap the owner saw came from the composition itself (the agent
    column started inside the headline's span, also visible in the mockup), not from the card. The grid now
    guarantees a gap.
  - **The headline is capped by its column** (a container query on the copy column: 231u up to `44cqi` on
    desktop, `min(42cqi, 12rem)` when stacked), so it can never reach the flow. It started as
    `min(42cqi, 19svh)`, replaced by the type scale below.
  - **The flow** is a 720×880 stage (first 720×720) scaled by one unitless factor
    (`tan(atan2(var(--stage-px, 100cqw), 720px))`), so bubbles, connectors and the `offset-path` token stay
    aligned.
  - **Below 1024px** everything stacks: headline, copy, CTA, badge, then the flow. Step names are counter-scaled
    and captions dropped below 640px.
- **Agent flow (owner request, revised).** The loop follows the standard tool-calling architecture, as in Google's
  "Gemini CLI architecture and interaction flow" (the owner's reference).
  - **Hub and spoke:** the agent (the robot) is the only participant that talks to the others.
  - **The LLM never calls RAG or tools.** It returns a tool-call request; the agent executes it and sends the
    result back to the LLM.
  - **GUARDRAILS** check the final answer before the agent responds to the user.
  - **Fourteen hops in total:** request → prompt + tools → tool call: retrieve → retrieve → context → context →
    tool call: act → execute → result → result → answer → policy check → approved → response.
  - **The label travels with the token** (no static captions, no AGENT card).
  - **Reveal and highlight:** participants appear when first reached, and the spoke in use is highlighted.
  - **Numbering:** step numbers are white circles centred on each bubble's edge, numbered by first involvement.
  - **Single source:** the hop sequence lives in `src/content/site.ts` and the geometry in `src/lib/hero-flow.ts`.
  - **Guarded:** unit and e2e tests check that every hop goes through the agent, and that RAG and tools run only
    right after an LLM request.
  - **Screen readers** get all 14 hops as an ordered list.
- **Hero type scale (owner request).** Type and spacing follow the design's 1600px canvas scaled like the mockup:
  one design unit (u) is 1/1600 of the design canvas.
  - **Sizes:** headline 231u, subhead 31u, body 15u, design gaps between blocks, CTA and trust badge scaled
    alike. Body and subhead have floors of 14px and 20px for readability.
  - **Fit to window (owner request):** the unit is `min(min(100vw, 1440px) / 1600, 100svh / 1067)`, so the
    complete hero (nav, copy, CTA, badges and flow) always fits the window.
  - **Balance (owner request: match the reference's balance).** The left column is one block: headline, text,
    then the CTA, trust badge and certification on one row right under the text, as in the design. The row runs
    into the stage's empty lower-left, so it is layered above the agent flow (`z-index`), and the badge text has
    a dark halo for legibility. The agent stage is a 720×880 portrait set flush with the hero's bottom edge, and
    the robot runs off it, cropped at the shins and fading out like the reference's portrait (the art is trimmed
    to the visible part). The robot sits right of centre so the row ends clear of its legs; the right-hand
    bubbles overhang the stage slightly. Prominent vertical bars glow behind the head and shoulders and fade
    upward past the stage (it clips only at the bottom; the bars ignore the pointer, as they reach behind the
    nav). Copy 540 : flow 761 on full-height windows (shorter windows give the extra width to the flow, see "Hero
    edges"); the headline cap is 44% of the copy column (it still fits).
- **Section and sub-page balance (owner request).** The home sections below the hero follow the design (within
  0.5–3% at 1440px); the owner kept the design's vector portraits. The sub-pages are balanced the standard way: a
  case study sets the story (intro, highlights, next step) beside the project image, centred against it, on
  desktop (phones keep the reading order); Privacy and Terms are one centred reading column; the 404 is centred;
  the projects list keeps the home section's alternating rows.
- **Certifications section (owner request).** After Experience, in the menu as "Certifications": "My Google Cloud
  Profile", from the owner's public Google Skills profile (`src/content/credentials.ts`). The Professional Cloud
  Developer certification comes first, as a compact card (max 400px) beside the heading and four icon stat tiles
  (2×2 below 1280px). Then the 7 skill badges as a gallery (4 across, legible at full size, the last slot linking to
  the profile) and the completion badges as a carousel: a native scroll-snap track (touch, trackpad,
  keyboard and no-JS work) whose scrollbar gives way, once enhanced, to arrow buttons and a progress line below the
  rail (owner: the standard place), edge fades and polite announcements. It reuses the Reviews carousel script,
  which now steps a page at a time where asked and re-measures when its track is laid out. The badge images are
  Google's own artwork, resized; every badge links to its public page so it can be verified. Badge types were confirmed from the artwork ("SKILL
  BADGE · ADVANCED" vs "COMPLETION BADGE"). Three completion badges for courses Google has retired are kept in the
  content but not shown (25 of 28). Chosen over a "ledger" variant (certification banner + year-grouped list).
- **External links open in a new tab (owner request).** Links to other sites (Google Skills badges and profile)
  use `target="_blank"` with `rel="noopener noreferrer"` and say "(opens in a new tab)" to screen readers
  (`Pill` has a `newTab` option). In-page and same-site links keep the normal behaviour.
- **Sticky menu separation (owner request).** The sticky menu shared the black sections' colour and blended into
  them. A gradient line and then a blue wash on the sections were tried and dropped (the wash made every section
  look alike, losing the black/blue rhythm). Instead the bar is frosted glass a shade lighter than the page (dark
  navy, `rgb(44 50 74 / 76%)` to `rgb(31 36 56 / 72%)`, blur 18px) with a faint top highlight and a soft shadow
  below, so it reads as its own layer over any section; the sections keep their original backgrounds. Chosen over a
  lighter slate tone, which competed with the headings.
- **About section (owner request, Oct 2026).** Stats are the owner's figures: 4+ years, 25+ Google Cloud badges, 10+
  platform integrations, 5+ industry domains, 5+ products launched (compliance frameworks removed). The copy keeps the
  owner's preferred opening and closing lines, with details from their LinkedIn About (telehealth, AI governance and
  supply chain work; "Building systems that think, act and scale autonomously"; LLM orchestration and RAG). The bot
  avatar is replaced by the owner's photo (their own blue/red-graded cut-out, `src/assets/about/usman-portrait.png`),
  slightly larger (240×300) so its bottom lines up with the stat tiles.
- **Education section removed (owner request, Oct 2026).** The section, its content and its menu item are gone; the
  Professional Cloud Developer certification it featured lives in Certifications. About's "Scroll down" ring now leads
  to Expertise.
- **Expertise cards (owner request, Oct 2026).** Four areas: AI (agentic and generative merged; the governance point
  folded in), Cloud (infrastructure, storage, networking, security, IAM), User Experience and Engineering (solution
  design). Each description is ~100 characters so every card wraps to the same three lines at 390-1440px
  (`text-wrap: pretty`); the intro is kept short enough to stay inside the inner ring at 1024px.
- **Projects: consistent labels, copy and illustration palette (owner request, Oct 2026).**
  - Labels follow one scheme, the industry, in standard terms: Media & Marketing, Business Intelligence, Mergers &
    Acquisitions, Healthcare, Risk & Compliance, Supply Chain, Logistics (replacing a mix of industries,
    technologies and coined terms such as "Warehouse AI").
  - Every summary is one professional sentence of about the same length (three lines at 1440px) with three
    parallel bullets; feature chips use sentence case and standard terms.
  - The HTML illustrations (`scripts/art/*.html`, rendered by `scripts/render-project-art.mjs`) share one
    brand-palette stage: blue on the outer top corner, crimson on the inner bottom corner, a faint violet centre,
    mirrored for image-right rows. Each product's own colour stays inside its UI; before, each stage carried its own
    accent glow (orange, teal, amber, green), so `/projects` read as seven colour schemes.
- **Contact section (owner request, Oct 2026).** A professional rewrite of the copy, and three round icon-only
  buttons (owner: no labels; each keeps an accessible name and a hover tooltip): LinkedIn (new tab), call (`tel:+923152331002`, shown as +92 315 2331002) and email (the new address,
  usmanaslam.aie@gmail.com, still percent-encoded so it never appears as plain text; `check-dist` rejects it in plain
  text). The portrait and the "Contact us" ring now keep clear of the copy column at 1024-1279px (the portrait's
  left is `max(50% - 420px, gutter + 200px)` and the ring moves with it). LinkedIn joins JSON-LD `sameAs`. The
  Privacy Policy mentions phone and LinkedIn contact (updated 15 October 2026).
- **One section rhythm (owner request, Oct 2026).** Every section's first content starts the same distance below its
  top edge, the About section's: `--section-start` (92px on desktop, 64px on phones). Headings sit on that line; the
  artwork-led sections align their first visible element instead (the Expertise ring, the Contact backdrop words,
  the Experience illustration on phones). Sub-pages start the same distance below the header. The Experience
  illustration's periodic "blink" (a fade to 25% every 5 s) is removed, so no illustration animates on its own.
- **Hero edges match the site (owner request, Oct 2026).** The hero scales its design composition (1333u) to fit the
  window, so on windows short enough to shrink it, its menu, copy and bubbles sat inside the content width that every
  other section uses. The hero is now the content width: the copy and menu start at the content's left edge, the
  "Let's talk" pill and the right-hand participants (LLM, RAG, Tools) reach its right edge, and the robot keeps its
  size and place. The stage keeps its design scale (`--stage-px`) and extends to the right; `scripts/hero.ts` moves
  the right-hand nodes out by the extra width and redraws their spokes and the token's paths (`spreadSpoke`).
  Full-height windows (1920x1080) are unchanged; no-JS keeps the design positions.
- **Hero robot (owner request).** The owner asked for AI-generated, high-resolution, full-body art and approved
  candidate "A, presenting" (`design-candidates/`, git-ignored).
  - The final art was produced with **Gemini 3 Pro Image on Vertex AI**, at
    1696×2528, using the approved draft as a reference image. Prompts live in `scripts/generate-robot-art.py`.
  - **Arms down (owner request: no hand raised in the air).** The shipped body is "A-rest", regenerated from the
    approved art with both arms relaxed at the sides.
  - `scripts/lib/cutout.mjs` removes the black background by flood-filling only border-connected darkness, so
    the visor and joints stay solid. Enclosed regions that are almost all pure black (the gap between an arm and
    the body) are treated as background too, and the alpha ramp starts just above each image's background level.
  - **Poses tried and dropped.** Per-step full-body poses, crossfaded, were built first; the owner found the
    transitions not smooth. Separate AI generations never match exactly, so swapping whole frames flickers.
  - **The head attends without head-turn pictures (owner requests, Oct 2026: "front face, then eye glide toward
    the active participant, helmet tilts, a short blink when it switches sides"; then "the head movement is a
    little less compared to the eyes").**
    - The static robot is the front-facing generation (F0) on the A-rest body (`scripts/build-robot-head.mjs
--default 2`, 40-row blend at the collar, so the body is identical below the seam). It faces the visitor
      at first paint, without JS, under reduced motion, and again once the answer is delivered.
    - The page animates only that photo's head. `scripts/build-head-layers.py` cuts it into a still neck plate
      and a helmet with the eye lights painted out (23 KB, loaded after the load event). On a canvas, the head
      carries most of the gaze and the eye lights add the last part, so the eyes never slide inside a still head:
      - toward the USER or the LLM the helmet turns 10°: row by row, its face slides around the fixed outline,
        so the side turning away narrows and the visor sheen and ear pods move with it. It also tilts 4° and
        shifts 6 art px. The head settles in 1.2 s on a critically damped spring (no overshoot);
      - the eye lights (radial glows matched to the photo's) lead on a 0.7 s spring and glide 17 art px: left
        for USER and GUARDRAILS, right for LLM, RAG and TOOLS, lower for the lower bubbles;
      - a short blink marks a switch from one side to the other.
    - Larger sideways shifts were rejected: the chin slid visibly across the neck. The neck stays clean because
      the tilt pivots on the trailing chin corner, the turn fades out over the chin, the helmet layer hugs the
      visor frame, and the still plate below continues the neck. The photo's mask hole sits 2 px inside the
      canvas, so their edges never meet, and the photo's shadow inside the head box is baked into the layers and
      drawn by the canvas (a filter on a wrapper would re-blur the robot on every frame).
    - Cost: the turn is redrawn on each frame of a turn (~1.4–1.9 ms on a desktop). Under 4× CPU throttling in
      headless Chromium (software canvas, pessimistic) a turn drops to ~27 fps.
  - **Head turns tried and dropped.** A 48-frame sprite (~175 KB) of five separately generated head angles
    (3/4 left, slight left, front, slight right, 3/4 right), morphed in between by a `tween-head.py` script, gave
    a real turn but never a smooth one. The angles disagree in detail (helmet shape, visor rim, ear ring), so
    blended frames showed two helmets and hard handovers read as pictures changing (owner: "easily person can
    feel pictures are changing"). One continuous Veo 3.1 image-to-video clip of the head turning was also
    built and reviewed; it was smooth, but restyled the eyes and ear ring. The owner chose the front face with
    head and eye motion. The tween script, its eye landmarks and the sprite step were removed (they are in git
    history); `build-robot-head.mjs` now builds only the static robot and the head box. Its left margin is
    3 px wider than the source frames need, to reproduce the box the shipped layers were cut to.
  - The energy "charge" is a tint masked to an alpha-only silhouette (`pnpm images`). Once the head canvas is
    live, the body's CSS fill clears only the head box and the canvas fills the head, cross-fading over 10 art
    px with the CSS fill's own gradients, so the shoulders above the collar fill and no edge shows (they used to
    stay unfilled). Under reduced motion the full mask covers the static head.
  - Gemini output carries Google's invisible SynthID watermark. Commercial use is governed by Google Cloud's
    generative AI terms (launch item 13).
- **Trust badge and certification (owner request).** "Trusted by innovators worldwide" is restored in the design's
  style (rotating dotted ring beside the text, after the CTA).
  - The certification is a second badge in exactly the same style (`RingBadge.astro`, `kind="cert"`), to the
    right of the trust badge. A vector certification seal takes the place of the "+" inside the ring, with "Google Cloud Certified /
    Professional Cloud Developer" beside it.
  - The raster Google badge was dropped: its lettering was unreadable at badge size. The seal is our own vector,
    not Google artwork.
  - It links to verification once `certification.credentialUrl` is set.
- **Headline.** Real `<h1>` text, with no SVG and no `textLength`. The design squeezed League Gothic to 70–79% of
  its natural width. I used the font's own **width axis** (`font-stretch: 81%`, variable font with `wdth`
  75–100) plus 10px word spacing, which reproduces the proportions without distorting glyphs.
- **Exact positions are reproduced with grids, not absolute coordinates.** Columns use `fr` units matching the
  1440 artboard, e.g. About `589fr 99fr 512fr` and Projects `600fr 66fr 534fr`. So the layout is exact at 1440 and
  scales between 1024 and 1440. Decorative layers (portraits, big background words, ring) are absolutely
  positioned relative to the page centre so they stay put above 1440.
- **Project illustrations** are HTML artwork in `scripts/art/*.html`, rendered to PNG at 2× with Playwright
  (`scripts/render-project-art.mjs`) and shipped as AVIF/WebP with descriptive alt text, instead of porting
  hundreds of decorative `<div>`s. The first three were screenshots of the mockup's `.shot` DOM via
  `scripts/render-design-assets.mjs`; all seven are now made in code (see "Projects" above).
- **Pill widths.** The design's pills have hand-set widths (109–178px). I used uniform padding (24px; compact
  19px for VIEW ALL), and every pill is at least **44px tall** (the design had 42–43px).

### Fidelity results at 1440px (`pnpm fidelity`, pixelmatch threshold 0.1)

Measured before the owner-requested redesigns (hero, Projects, Contact) and the removal of Education. Those
sections now intentionally differ from the design export, so their rows are historical; `pnpm fidelity` no
longer compares Education.

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
  Manrope (above the fold) are preloaded. Capsize-generated metric-adjusted fallbacks prevent layout shift. They
  load local Arial, Times New Roman or Courier New, or their metric-identical Linux twins (Liberation, Arimo,
  Tinos, Cousine): without the twins, Linux had no fallback and the case-study page shifted (CLS 0.14 in CI).
  Weights are restricted to those used: Hanken 200–600 + 300 italic, Manrope 300–700.
- **Hero image (LCP).** The robot cut-out ships as AVIF/WebP/PNG at widths 360/540/720, never lazy. On desktop,
  where the robot is the LCP element, it is preloaded via `imagesrcset` with `fetchpriority="high"`
  (`media="(width >= 64rem)"`). On phones the LCP is the headline, so the `<img>` itself has default priority:
  at high priority the 46 KB image raced the render-blocking stylesheet in the first round trips and pushed
  simulated mobile LCP from ~1.85s to ~2.11s, depending on how Chrome happened to queue the requests.
  Lighthouse judges resolution against the robot's untransformed 343px CSS width inside the scaled stage, so
  `sizes` steers phones to the 540 file, encoded at quality 56 (~43 KB) so the headline's LCP stays under 2 s.
  The head layers load only after the load event.
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
    A menu click (or arriving with a `#hash`) before the page is idle switches it off first, so those land
    exactly too. One anchor offset only: `scroll-padding-top` on the root (a duplicate `scroll-margin-top` on
    every `[id]` had sections landing 64px low, under a strip of the previous section).
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
- **Page weight on `/`** (LHCI budget 512 KB, mobile). It had crept to ~512–515 KB, which left no headroom.
  Three fixes bring it to **368 KB** (515 KB in the same local run before), with no change to the design:
  - **The phone layout viewport was 4× too wide.** The Certifications rail's visually-hidden "(opens in a new
    tab)" spans were positioned against the section, outside the rail's scroller. They overflowed the page to
    ~4400px, and phone Chrome grew the layout viewport to 1648×3292 CSS px. The fixed header widened with it,
    so its menu button sat off-screen. Lazy images also measured their distance from that huge viewport, so
    everything down to Projects loaded on first visit. `.badge-link` is now positioned to keep them inside.
    An e2e test asserts `innerWidth` equals the device width on phones.
  - **The Expertise ring layers (~85 KB) load only once the section is within 1250px** (Chrome's 4G lazy
    distance). Native `loading="lazy"` still fetched them in Lighthouse, ~2600px below the fold. The two
    `<Picture>`s sit in a `<noscript data-defer>`: without JS they render as before (lazy images). With JS,
    `scripts/defer.ts` parses the noscript's text into their place when the ring nears the viewport. They are
    absolutely positioned, so insertion causes no layout shift.
  - **Only one charge mask is fetched.** The charge layer stays `display: none` (so its mask is not requested)
    until `scripts/hero.ts` needs it, i.e. when the first hop starts. By then the head canvas is normally live,
    so only the body mask loads. The whole-robot mask loads only if the head layers are not ready yet, or under
    reduced motion. This saves 16 KB. Level 0 is invisible, so showing the layer later looks identical.

  The 175 KB head sprite was later replaced by 23 KB of head layers (see "Hero robot"), a further saving.

- **Lighthouse CI, local, mobile, simulated throttling** (median of 3):

  | Page                                | Perf | A11y | BP  | SEO | LCP   | CLS | TBT  | Transfer |
  | ----------------------------------- | ---- | ---- | --- | --- | ----- | --- | ---- | -------- |
  | `/`                                 | 0.99 | 1    | 1   | 1   | 1.82s | 0   | 0 ms | 356 KB   |
  | `/projects`                         | 0.99 | 1    | 1   | 1   | 1.81s | 0   | 0 ms | 196 KB   |
  | `/projects/multi-agent-ai-platform` | 0.99 | 1    | 1   | 1   | 1.66s | 0   | 0 ms | 105 KB   |
  | `/privacy`                          | 1    | 1    | 1   | 1   | 1.51s | 0   | 0 ms | 84 KB    |

  Measured 15 October 2026, after the robot-priority fix above; CI on GitHub's Linux runners passes the same
  budgets. Every page has 180-490ms of LCP headroom. A real high-resolution hero (smaller than the upscale at
  equal quality) or inlined critical CSS (would need per-build CSP hashes) are the next levers if that shrinks.

- **Home HTML and CSS trimmed (Oct 2026).** The hidden Reviews section's styles moved to their own stylesheet
  (`reviews.css`), linked by `Reviews.astro` only when the section renders; a static or dynamic import alone
  would still bundle them site-wide (stylesheet 12.9 KB → 12.5 KB Brotli). The Experience and Contact robot
  portraits are built as SVG files (`/art/agent-*.svg`, from `src/lib/agent-portrait.ts`) and shown as lazy
  `<img>`s instead of inline markup (home HTML 13.5 KB → 12.6 KB, fewer DOM nodes). Neither fixed the LCP
  regression on its own; the image priority above did. Lighthouse's `LANTERN_DEBUG=1` with `--save-assets`
  writes the simulated request timeline, which is how the cause was found.

- **Not yet done on real hardware:** DevTools throttled-CPU profiling on a mid-range phone and real-device
  WebPageTest runs. These are launch-checklist items.

## Security decisions

- Strict header CSP in `firebase.json`: `script-src 'self'; style-src 'self'`, no `unsafe-inline`.
  - The build emits **no inline scripts, inline styles or `style=""` attributes** (`inlineStylesheets: 'never'`,
    `assetsInlineLimit: 0`). `check-dist` enforces this.
  - JSON-LD is a non-executable data block.
  - Astro's built-in CSP was not used because it only emits a `<meta>` tag, which cannot carry `frame-ancestors`.
- HSTS (preload-ready), nosniff, strict referrer policy, deny-all Permissions-Policy, COOP/CORP same-origin and
  `X-Frame-Options: DENY`, all in `firebase.json`, so they apply only on Firebase Hosting (see below).
- **GitHub Pages hosting (Oct 2026).** Pages cannot send response headers, so `BaseLayout` also ships the
  `firebase.json` CSP as a `<meta http-equiv>` tag, minus `frame-ancestors` (ignored in meta) and
  `upgrade-insecure-requests` (Pages enforces HTTPS). Clickjacking protection, HSTS preload and Permissions-Policy
  remain Firebase-only; moving to Firebase Hosting restores them with no code change.
- The local preview server (`scripts/serve.mjs`) applies the same headers, so e2e tests catch CSP violations.
- No cookies, analytics, trackers or third-party requests. An e2e test asserts the site makes requests to one
  origin only.

## Tooling notes

- **Firefox headline size (Oct 2026).** At 1280×720, Firefox (CI only) renders the hero headline at 154px where
  Chromium and WebKit render 155.9px (`min(231u, 44cqi)`). 154 is exactly 44cqi of a 350px column although the
  column lays out 507px wide, so Firefox appears to resolve the container-unit cap against the column's
  provisional grid width. The difference is 1.2% with no visible effect, so the e2e check allows 2%.
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

- `scripts/prune-dist.mjs` removes every hashed file in `/_astro` that nothing references, such as the originals
  of transformed images (only their derivatives are used) and the compiled-but-unrendered Reviews script.
- Linux visual baselines can't be generated on the Windows development machine. Run the CI workflow manually
  with `update_baselines: true`, review the uploaded screenshots, and commit them to
  `tests/visual/__screenshots__/linux/`.
- Illustration colours (agent portraits in `src/lib/agent-portrait.ts`, orb icons, flyers) are artwork data
  inside the illustrations, not UI tokens.
