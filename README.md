# Usman Aslam — Portfolio

One-page portfolio for Usman Aslam (Lead AI Engineer, agentic AI on Google Cloud), built from the
"★ Portfolio · full one-page site" design export. It is a static Astro site with about 5 KB (Brotli) of
JavaScript, self-hosted fonts, a strict CSP, and automated quality gates. Live at https://usmanaie.github.io.

- **Decisions and deviations:** [DECISIONS.md](DECISIONS.md)
- **Launch status and owner items:** [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)

## Setup

Requirements: Node 22.19 (`.nvmrc`), pnpm 12.11 (`corepack enable` or `npm i -g pnpm@12.11.2`).

```bash
pnpm install
pnpm exec playwright install chromium firefox webkit   # for e2e / visual tests
pnpm dev                                               # http://localhost:4321
```

### Claude Code design skills

The UI/UX Pro Max skills live in `.claude/skills/`, which is git-ignored. Reinstall them on each machine
(requires Node.js and Python 3):

```bash
npm install -g ui-ux-pro-max-cli
uipro init --ai claude
```

## Scripts

| Script                                          | What it does                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                      | Astro dev server                                                                                                           |
| `pnpm build`                                    | Production build → `dist/`, then prune unused artefacts and run the production gate (`scripts/check-dist.mjs`)             |
| `pnpm build:fixture`                            | Test-only build with placeholder reviews → `dist-fixture/` (never deployed)                                                |
| `pnpm preview`                                  | Serve `dist/` with the production headers from `firebase.json` (port 4173)                                                 |
| `pnpm preview:fixture`                          | Serve `dist-fixture/` the same way (port 4174)                                                                             |
| `pnpm lint`                                     | ESLint (astro + jsx-a11y + typescript), Stylelint, Prettier check                                                          |
| `pnpm typecheck`                                | `astro check` (strict TypeScript)                                                                                          |
| `pnpm test`                                     | Vitest unit tests (carousel, scroll-spy, menu, hero flow, experience dates, utilities)                                     |
| `pnpm test:e2e`                                 | Playwright: e2e + axe in Chromium, Firefox and WebKit, carousel on the fixture build, visual regression (build both first) |
| `pnpm lhci`                                     | Lighthouse CI with the performance budgets (mobile, throttled)                                                             |
| `pnpm fidelity`                                 | Pixel comparison against the design references at 1440px (needs `pnpm preview:fixture`)                                    |
| `pnpm fonts` / `pnpm images`                    | Regenerate subset fonts / derived images and icons                                                                         |
| `node scripts/render-project-art.mjs [name...]` | Render project illustrations from `scripts/art/<name>.html` (all of them when no name is given)                            |
| `pnpm design:render <dir>`                      | Re-render the Expertise ring layers and fidelity references from the unzipped design export (see below)                    |

`pnpm design:render` also overwrites `agentic-ai.png`, `telehealth.png` and `ai-governance.png` in
`src/assets/projects/` with the design export's original illustrations. Those images now come from
`scripts/art/`, so run `node scripts/render-project-art.mjs` afterwards to restore them.

## Architecture

```
src/
  content/        typed copy and data: site, nav, stats, credentials, expertise, projects, experience, reviews, legal
  styles/         tokens.css (design tokens), fonts.css (generated), global.css
  layouts/        BaseLayout (head, SEO, header/footer), SubPageLayout
  components/
    sections/     one component per section: Hero, About, Expertise, Projects, Experience, Certifications, Reviews, Contact
    layout/       SiteHeader (sticky + mobile menu), SiteFooter, PageIntro, LegalPage
    ui/           primitives: Pill, Eyebrow, SectionHeading, Icon, AgentPortrait, RotatingRingLink
    hero/         AgentFlow (the agent loop and robot), RingBadge (trust and certification badges)
    projects/     ProjectList, ProjectRow
  lib/            build-time helpers: hero-flow geometry, hero image, agent portrait drawing, email encoding,
                  experience dates, JSON-LD
  scripts/        client TS: hero, header, menu, scroll-spy, carousel, visibility, defer, ready
  pages/          index, projects/, projects/[slug], privacy, terms, 404, robots.txt, sitemap.xml,
                  art/[file] (the agent portrait SVGs)
  assets/         fonts, hero art + masks, About portrait, project illustrations, Expertise ring layers,
                  credential badges, employer logos, brand icon
scripts/          build tooling (fonts, images, design and project-art renders, robot art, OG image, serve, prune,
                  check-dist, fidelity); art/ holds the project illustrations' HTML sources
tests/            unit/ (Vitest), e2e/ (Playwright + axe), visual/ (baselines + design references), fixtures/
```

- **Zero JS by default.** Each interactive piece is a small module loaded only by the component that needs it.
  There's no framework runtime.
- **The hero** is a two-column grid, sized so the whole hero fits the window: the copy on the left, and on the
  right an agent loop in which a robot routes every message between the user, the LLM, RAG, tools and
  guardrails. The flow's 720×880 stage is scaled by one CSS-only unitless factor, so its bubbles, connectors and
  moving token stay aligned. Below 1024px the hero stacks. Animations pause off-screen, and reduced motion gets a
  designed end-state frame. The hop sequence is in `src/content/site.ts` and the geometry in
  `src/lib/hero-flow.ts`. DECISIONS.md → Fidelity decisions explains the layout.
- **Production gate.** `check-dist` fails the build on any of: inline scripts or styles (CSP), placeholder text,
  the plain-text email, dead links or anchors, third-party resources, unreferenced assets, or JS over 30 KB.

## Editing content

All copy lives in `src/content/*.ts`; components contain no hard-coded copy.

- **Job title:** `site.jobTitle` in `site.ts`. It feeds the `<title>`, footer tagline and JSON-LD.
- **Years of experience:** derived from `CAREER_START` in `site.ts`, which updates the About stat, the
  Experience numeral and the intro sentence.
- **Stats, credentials, expertise, experience, projects:** their respective files. Case-study pages are generated
  from `projects.ts`.
- **Projects:** `featured: 1`–`3` puts a project in one of the home page's three rows. Projects without it appear
  only on `/projects`, which lists every project. Each illustration is an HTML file in `scripts/art/`, rendered to
  `src/assets/projects/` with `node scripts/render-project-art.mjs <name>`. Add every new case-study route to
  `PAGES` in `tests/e2e/helpers.ts`, so the e2e and axe suites cover it.
- **Reviews:** add real, permitted quotes to `items` in `reviews.ts` and set `enabled: true`. The section and its
  nav links then appear automatically.
- **Privacy / Terms:** `legal.ts`; update `lastUpdated` when the text changes.
- Lines marked `OWNER-CONFIRM` are claims awaiting verification (see the launch checklist).

## Deploy (GitHub Pages, live now)

The site is live at **https://usmanaie.github.io**, served by GitHub Pages from this repository.

- Every push to `main` runs the pipeline below; when e2e and Lighthouse pass, the `deploy-pages` job publishes
  `dist/`. Pages settings: Source = GitHub Actions. Repository variable `SITE_URL` = `https://usmanaie.github.io`.
- GitHub Pages cannot send custom response headers. The CSP ships as a `<meta>` tag instead (generated from
  `firebase.json`), but `frame-ancestors`, `X-Frame-Options`, HSTS preload and Permissions-Policy only apply on
  Firebase Hosting (below).
- **Rollback:** revert the offending commit on `main` and push; or re-run an earlier successful CI run's
  `deploy-pages` job.

## Deploy (Firebase Hosting, optional)

Once `FIREBASE_PROJECT_ID` is set, Firebase replaces GitHub Pages: the Pages job is skipped and the Firebase jobs
below run instead. One-time setup, done by the owner in their GCP project:

1. Create a Firebase project and enable Hosting.
2. Create a service account with the **Firebase Hosting Admin** role.
3. Create a Workload Identity pool and an OIDC provider for `token.actions.githubusercontent.com`, restricted to
   this repository (`attribute.repository == "<owner>/<repo>"`). Grant the provider
   `roles/iam.workloadIdentityUser` on the service account.
4. Add these GitHub repository variables (not secrets; no keys are stored):
   `FIREBASE_PROJECT_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER` (full resource name), `GCP_SERVICE_ACCOUNT`, `SITE_URL`
   (e.g. `https://example.com`).
5. In Firebase Hosting, connect the apex domain and add `www` as a redirect to it. Firebase provisions TLS and
   always serves HTTPS.

The pipeline (`.github/workflows/ci.yml`):

1. install → lint → type-check → unit → audit → build
2. e2e + axe in three browsers, visual regression and Lighthouse CI, in parallel. Visual regression compares
   only once Linux baselines are committed (see below); until then the job passes without comparing.
3. deploy: on `main`, GitHub Pages once e2e and Lighthouse pass. With Firebase configured instead, the
   production deploy on `main` and a **preview channel per PR**, each once e2e, visual and Lighthouse pass

Firebase deploy jobs are skipped until `FIREBASE_PROJECT_ID` is set.

**Rollback:** in the Firebase console, open Hosting → Release history and choose "Roll back" on the last good
release, or run:

```bash
npx firebase-tools@14 hosting:clone <project>:live@<previous-version-id> <project>:live
```

Then revert the offending commit on `main`.

**Visual baselines:** run the CI workflow manually with `update_baselines: true`, download the `visual-results`
artifact, review the screenshots, and commit them to `tests/visual/__screenshots__/linux/`.

## Operations

- **Uptime:** create a Google Cloud Monitoring uptime check (HTTPS, path `/`, every 5 minutes) on the production
  URL, with an email alert policy.
- **Real-user Core Web Vitals:** verify the site in Google Search Console and watch the Core Web Vitals report.
  GitHub Pages has no traffic dashboard; Search Console's performance report is the closest substitute (Firebase
  Hosting would add a usage dashboard).
- **Dependencies:** Dependabot opens weekly grouped PRs; CI runs `pnpm audit --audit-level high`.

## Asset provenance

- **Hero robot** (`src/assets/hero/robot-agent.png`) was generated with Gemini 3 Pro Image on Vertex AI
  (`python scripts/generate-robot-art.py --vertex-project <id>`). Rebuild it with
  `node scripts/build-robot-head.mjs <A-rest.png> <head-L20.png> <head-LH2.png> <head-F0.png> <A-rest.png> <head-RH.png>`
  (needs Python with `opencv-python-headless` and `numpy`; it also writes a head-turn sprite the page no longer
  uses, so delete `robot-head-sprite.webp`), then `python scripts/build-head-layers.py` (the head layers the page
  animates, cut from `robot-agent.png`; no new art) and `pnpm images`. The prompts in the script are the provenance record; commercial-use sign-off is launch
  checklist item 13.
- **Certification seal** in the hero is original vector artwork.
- **Certifications section:** the Professional Cloud Developer badge and the skill/completion badge images
  (`src/assets/credentials/`) are Google's artwork for credentials the owner earned, shown unmodified (resized)
  and linked to their public verification pages on Google Skills.
- **About portrait** (`src/assets/about/usman-portrait.png`) is the owner's own photo.
- **Project illustrations** are original artwork made in code (HTML in `scripts/art/`, no screenshots or
  generated images). `scripts/render-project-art.mjs` renders them to `src/assets/projects/`, and the PNGs are
  committed.
- **The agent portraits** (Experience, Contact) and the **Expertise ring** are original vector artwork from the
  design export. The portraits are drawn in `src/lib/agent-portrait.ts` and built to `/art/agent-*.svg` at build
  time. `pnpm design:render` pre-renders the ring's glow layers to PNG, and those files are committed.
- Fonts are all under the SIL Open Font License: Manrope, Hanken Grotesk, League Gothic, Instrument Serif,
  JetBrains Mono. They're subset from the `@fontsource` packages. Their metric-matched fallbacks use local Arial,
  Times New Roman and Courier New, or their Linux twins (Liberation, Arimo, Tinos, Cousine).
