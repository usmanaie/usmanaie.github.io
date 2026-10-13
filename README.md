# Usman Aslam — Portfolio

One-page portfolio for Usman Aslam (Lead Software Engineer, agentic AI on Google Cloud), built from the
"★ Portfolio · full one-page site" design export. It is a static Astro site with about 1.5 KB of JavaScript,
self-hosted fonts, a strict CSP, and automated quality gates.

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

| Script                       | What it does                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                   | Astro dev server                                                                                                           |
| `pnpm build`                 | Production build → `dist/`, then prune unused artefacts and run the production gate (`scripts/check-dist.mjs`)             |
| `pnpm build:fixture`         | Test-only build with placeholder reviews → `dist-fixture/` (never deployed)                                                |
| `pnpm preview`               | Serve `dist/` with the production headers from `firebase.json` (port 4173)                                                 |
| `pnpm lint`                  | ESLint (astro + jsx-a11y + typescript), Stylelint, Prettier check                                                          |
| `pnpm typecheck`             | `astro check` (strict TypeScript)                                                                                          |
| `pnpm test`                  | Vitest unit tests (carousel, scroll-spy, menu, utilities)                                                                  |
| `pnpm test:e2e`              | Playwright: e2e + axe in Chromium, Firefox and WebKit, carousel on the fixture build, visual regression (build both first) |
| `pnpm lhci`                  | Lighthouse CI with the performance budgets (mobile, throttled)                                                             |
| `pnpm fidelity`              | Pixel comparison against the design references at 1440px (needs `pnpm preview:fixture`)                                    |
| `pnpm fonts` / `pnpm images` | Regenerate subset fonts / derived images and icons                                                                         |
| `pnpm design:render <dir>`   | Re-render illustrations, ring layers and references from the unzipped design export                                        |

## Architecture

```
src/
  content/        typed copy and data: site, nav, stats, education, expertise, projects, experience, reviews, legal
  styles/         tokens.css (design tokens), fonts.css (generated), global.css
  layouts/        BaseLayout (head, SEO, header/footer), SubPageLayout
  components/
    sections/     one component per section: Hero, About, Education, Expertise, Projects, Experience, Reviews, Contact
    layout/       SiteHeader (sticky + mobile menu), SiteFooter, PageIntro, LegalPage
    ui/           primitives: Pill, Eyebrow, SectionHeading, Icon, AgentPortrait, RotatingRingLink
    hero/         AgentOrb
    projects/     ProjectRow
  scripts/        client TS: hero, header, menu, scroll-spy, carousel, visibility
  pages/          index, projects/, projects/[slug], privacy, terms, 404, robots.txt, sitemap.xml
  assets/         fonts, hero art + mask, project illustrations, Expertise ring layers, brand icon
scripts/          build tooling (fonts, images, design renders, OG image, serve, prune, check-dist, fidelity)
tests/            unit/ (Vitest), e2e/ (Playwright + axe), visual/ (baselines + design references), fixtures/
```

- **Zero JS by default.** Each interactive piece is a small module loaded only by the component that needs it.
  There's no framework runtime.
- **The hero** keeps the design's 1600×1067 composition at ≥ 1024px, scaled by a CSS-only unitless factor. Below
  that it re-flows. Animations pause off-screen, and reduced motion gets a designed end-state frame.
- **Production gate.** `check-dist` fails the build on any of: inline scripts or styles (CSP), placeholder text,
  the plain-text email, dead links or anchors, third-party resources, unreferenced assets, or JS over 30 KB.

## Editing content

All copy lives in `src/content/*.ts`; components contain no hard-coded copy.

- **Job title:** `site.jobTitle` in `site.ts`. It feeds the `<title>`, footer tagline and JSON-LD.
- **Years of experience:** derived from `CAREER_START` in `site.ts`, which updates the About stat, the
  Experience numeral and the intro sentence.
- **Stats, education, expertise, experience, projects:** their respective files. Project illustrations are in
  `src/assets/projects/`. Case-study pages are generated from `projects.ts`.
- **Reviews:** add real, permitted quotes to `items` in `reviews.ts` and set `enabled: true`. The section and its
  nav links then appear automatically.
- **Privacy / Terms:** `legal.ts`; update `lastUpdated` when the text changes.
- Lines marked `OWNER-CONFIRM` are claims awaiting verification (see the launch checklist).

## Deploy (Firebase Hosting)

One-time setup, done by the owner in their GCP project:

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
2. e2e + axe in three browsers, visual regression and Lighthouse CI, in parallel
3. a **preview channel per PR**, with its URL posted as a comment
4. **production deploy on `main`** once every gate passes

Deploy jobs are skipped until `FIREBASE_PROJECT_ID` is set.

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
- **Real-user Core Web Vitals:** verify the domain in Google Search Console and watch the Core Web Vitals report.
  Firebase Hosting's usage dashboard shows traffic and bandwidth.
- **Dependencies:** Dependabot opens weekly grouped PRs; CI runs `pnpm audit --audit-level high`.

## Asset provenance

- **Hero robot** (`src/assets/hero/robot-agent.png`) was generated with Gemini 3 Pro Image on Vertex AI
  (`python scripts/generate-robot-art.py --vertex-project <id>`), then cut out with `node scripts/cutout-robot.mjs`
  and `pnpm images`. The prompts in the script are the provenance record; commercial-use sign-off is launch
  checklist item 13.
- **Certification seal** in the hero is original vector artwork (no Google badge artwork is used).
- Project illustrations, the agent portraits and the Expertise ring are original vector artwork from the design
  export, rendered to raster at build time.
- Fonts are all under the SIL Open Font License: Manrope, Hanken Grotesk, League Gothic, Instrument Serif,
  JetBrains Mono. They're subset from the `@fontsource` packages.
