/**
 * Builds the self-hosted, subsetted WOFF2 fonts and the matching @font-face CSS.
 *
 * Sources are the Latin files shipped by @fontsource. Each family is cut down to
 * the characters and weight range the design actually uses, and a metric-adjusted
 * local fallback face is generated (via Capsize) so swapping fonts causes no shift.
 *
 * Output (committed): src/assets/fonts/*.woff2 and src/styles/fonts.css.
 * Run with: pnpm fonts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFontStack } from '@capsizecss/core';
import arial from '@capsizecss/metrics/arial';
import courierNew from '@capsizecss/metrics/courierNew';
import timesNewRoman from '@capsizecss/metrics/timesNewRoman';
import { fromBuffer } from '@capsizecss/unpack';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/assets/fonts');
const cssFile = path.join(root, 'src/styles/fonts.css');

const ASCII = Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('');
const TYPOGRAPHY = '‘’“”–—…·•©×→↗ ';
const UPPER_DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 +&-.,’';

/** @type {Array<{file: string, src: string, family: string, style: 'normal'|'italic', weight: string, stretch?: string, text: string, axes?: Record<string, number | {min: number, max: number}>, fallback: object}>} */
const FONTS = [
  {
    file: 'manrope-var.woff2',
    src: '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
    family: 'Manrope',
    style: 'normal',
    weight: '300 700',
    text: ASCII + TYPOGRAPHY,
    axes: { wght: { min: 300, max: 700 } },
    fallback: arial,
  },
  {
    file: 'hanken-grotesk-var.woff2',
    src: '@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2',
    family: 'Hanken Grotesk',
    style: 'normal',
    weight: '200 600',
    text: ASCII + TYPOGRAPHY,
    axes: { wght: { min: 200, max: 600 } },
    fallback: arial,
  },
  {
    // Italic is only used for the light accent phrases in headings and the timeline roles.
    file: 'hanken-grotesk-300-italic.woff2',
    src: '@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-italic.woff2',
    family: 'Hanken Grotesk',
    style: 'italic',
    weight: '300',
    text: ASCII + TYPOGRAPHY,
    axes: { wght: 300 },
    fallback: arial,
  },
  {
    // Width axis kept (75-100%): the hero headline and contact backdrop use the condensed
    // end to match the design's proportions without distorting glyphs (no textLength).
    file: 'league-gothic-var.woff2',
    src: '@fontsource-variable/league-gothic/files/league-gothic-latin-wdth-normal.woff2',
    family: 'League Gothic',
    style: 'normal',
    weight: '400',
    stretch: '75% 100%',
    text: UPPER_DIGITS,
    axes: { wdth: { min: 75, max: 100 } },
    fallback: arial,
  },
  {
    file: 'instrument-serif.woff2',
    src: '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
    family: 'Instrument Serif',
    style: 'normal',
    weight: '400',
    text: ASCII + TYPOGRAPHY,
    fallback: timesNewRoman,
  },
  {
    file: 'jetbrains-mono.woff2',
    src: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    family: 'JetBrains Mono',
    style: 'normal',
    weight: '400',
    text: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·.-',
    fallback: courierNew,
  },
];

const slug = (family) => family.toLowerCase().replace(/\s+/g, '-');

await mkdir(outDir, { recursive: true });
await mkdir(path.dirname(cssFile), { recursive: true });

const faces = [];
const fallbacks = new Map();

/**
 * Metric-compatible twins of the fallback fonts (identical advance widths and vertical metrics), for systems
 * without the Microsoft core fonts, such as Linux. Without them the fallback face never loads there and the
 * swap to the web font shifts the layout.
 */
const METRIC_TWINS = {
  Arial: "local('Liberation Sans'), local('LiberationSans'), local('Arimo')",
  'Times New Roman': "local('Liberation Serif'), local('LiberationSerif'), local('Tinos')",
  'Courier New': "local('Liberation Mono'), local('LiberationMono'), local('Cousine')",
};
let total = 0;

for (const font of FONTS) {
  const source = await readFile(require.resolve(font.src));
  const subset = await subsetFont(source, font.text, {
    targetFormat: 'woff2',
    ...(font.axes ? { variationAxes: font.axes } : {}),
  });
  await writeFile(path.join(outDir, font.file), subset);
  total += subset.length;
  console.log(
    `${font.file.padEnd(34)} ${(source.length / 1024).toFixed(1).padStart(6)} KB -> ${(subset.length / 1024).toFixed(1).padStart(5)} KB`,
  );

  faces.push(
    `@font-face {\n  font-family: '${font.family}';\n  font-style: ${font.style};\n  font-weight: ${font.weight};\n  font-display: swap;\n  src: url('../assets/fonts/${font.file}') format('woff2');\n}`,
  );

  if (!fallbacks.has(font.family)) {
    const metrics = await fromBuffer(source);
    const { fontFaces } = createFontStack([{ ...metrics, familyName: font.family }, font.fallback], {
      fontFaceFormat: 'styleString',
    });
    fallbacks.set(
      font.family,
      fontFaces
        .replace(/font-family: "([^"]+)"/, `font-family: '${slug(font.family)}-fallback'`)
        .replace(/"/g, "'")
        .replace(/(src: [^;]+);/, (_, src) =>
          `${src}, ${METRIC_TWINS[font.fallback.familyName] ?? ''};`.replace(', ;', ';'),
        ),
    );
  }
}

const css = `/* Generated by scripts/build-fonts.mjs. Do not edit by hand; run \`pnpm fonts\`. */\n\n${faces.join('\n\n')}\n\n/* Metric-adjusted local fallbacks (prevent layout shift while the web fonts load). */\n${[...fallbacks.values()].join('\n')}\n`;
await writeFile(cssFile, css);
console.log(`Total font payload: ${(total / 1024).toFixed(1)} KB`);
