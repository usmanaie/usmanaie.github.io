/**
 * The illustrated agent head used in Experience and Contact: one drawing, a colourway per section
 * (read from the design). Built into a standalone SVG file per variant (src/pages/art/[file].ts) and
 * shown as a decorative <img>, so the drawing stays out of the home page HTML.
 */
export type PortraitVariant = 'experience' | 'contact';

export const PORTRAIT_VARIANTS: readonly PortraitVariant[] = ['experience', 'contact'];

export const portraitSrc = (variant: PortraitVariant) => `/art/agent-${variant}.svg`;

const BLUE = '#4FC3FF';
const RED = '#FF3D52';
const PINK = '#FF5A6E';

interface Colourway {
  lit: readonly (readonly [number, string])[];
  litOpacity: number;
  shadeCx: string;
  shadeTop: number;
  visor: readonly [string, string, string];
  body: readonly [string, string, string];
  left: string;
  right: string;
  sheen: number;
  visorStroke: readonly [string, number];
  bars: readonly [readonly [string, number], readonly [string, number]];
  eyes: readonly [readonly [string, string], readonly [string, string]];
  mouth: string;
}

const VARIANTS: Record<PortraitVariant, Colourway> = {
  experience: {
    lit: [
      [0, RED],
      [0.42, '#C2306A'],
      [0.52, '#2B6FFF'],
      [1, BLUE],
    ],
    litOpacity: 0.74,
    shadeCx: '42%',
    shadeTop: 0.5,
    visor: ['#2A0A14', '#03050A', '#0A1A33'],
    body: ['#5A1424', '#0A0D16', '#1B3A78'],
    left: RED,
    right: BLUE,
    sheen: 0.2,
    visorStroke: ['#FFB0BC', 0.55],
    bars: [
      [PINK, 0.45],
      [BLUE, 0.5],
    ],
    eyes: [
      [PINK, '#FFD0D6'],
      [BLUE, '#BFEAFF'],
    ],
    mouth: 'M248 388 C 266 394 290 394 306 388',
  },
  contact: {
    lit: [
      [0, RED],
      [0.3, '#C2306A'],
      [0.42, '#2B6FFF'],
      [1, BLUE],
    ],
    litOpacity: 0.76,
    shadeCx: '58%',
    shadeTop: 0.45,
    visor: ['#1A0A12', '#03050A', '#0A1A33'],
    body: ['#5A1424', '#0A0D16', '#1B3A78'],
    left: RED,
    right: BLUE,
    sheen: 0.2,
    visorStroke: ['#9FD8FF', 0.6],
    bars: [
      [BLUE, 0.55],
      [BLUE, 0.4],
    ],
    eyes: [
      [BLUE, '#BFEAFF'],
      [BLUE, '#BFEAFF'],
    ],
    mouth: 'M250 390 C 266 394 288 394 304 390',
  },
};

const HEAD =
  'M300 70 C 400 70 452 150 452 250 C 452 340 420 410 368 448 C 340 468 262 468 234 448 C 182 410 150 340 150 250 C 150 150 202 70 300 70 Z';

/** The complete SVG document for one colourway. */
export function agentPortraitSvg(variant: PortraitVariant): string {
  const v = VARIANTS[variant];
  const stops = (colors: readonly string[]) =>
    colors.map((color, i) => `<stop offset="${i / 2}" stop-color="${color}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720">
<defs>
<linearGradient id="lit" x1="0" y1="0" x2="1" y2="0">${v.lit.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('')}</linearGradient>
<radialGradient id="shade" cx="${v.shadeCx}" cy="32%" r="72%"><stop offset="0" stop-color="#ffffff" stop-opacity="${v.shadeTop}"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".06"/><stop offset="1" stop-color="#000000" stop-opacity=".6"/></radialGradient>
<linearGradient id="visor" x1="0" y1="0" x2="1" y2="0">${stops(v.visor)}</linearGradient>
<linearGradient id="body" x1="0" y1="0" x2="1" y2="0">${stops(v.body)}</linearGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<path d="M40 720 C 60 610 150 560 230 548 L 370 548 C 450 560 540 610 560 720 Z" fill="url(#body)"/>
<path d="M40 720 C 60 610 150 560 230 548" stroke="${v.left}" stroke-opacity=".6" stroke-width="2" fill="none"/>
<path d="M560 720 C 540 610 450 560 370 548" stroke="${v.right}" stroke-opacity=".6" stroke-width="2" fill="none"/>
<rect x="262" y="430" width="76" height="125" rx="14" fill="#0E1424"/>
<path d="M262 455H338M262 478H338M262 501H338M262 524H338" stroke="#2A3B66" stroke-width="3"/>
<path d="M272 440 C 266 480 270 520 262 552" stroke="${v.left}" stroke-width="2.5" fill="none" opacity=".85"/>
<path d="M328 440 C 336 480 330 520 338 552" stroke="${v.right}" stroke-width="2.5" fill="none" opacity=".85"/>
<circle cx="300" cy="512" r="12" fill="${BLUE}" filter="url(#glow)"/>
<circle cx="300" cy="512" r="5" fill="#CFF1FF"/>
<ellipse cx="300" cy="552" rx="82" ry="16" fill="#0A0E18" stroke="#2B6FFF" stroke-opacity=".5" stroke-width="2"/>
<path d="${HEAD}" fill="#E8EDF5"/>
<path d="${HEAD}" fill="url(#lit)" opacity="${v.litOpacity}"/>
<path d="${HEAD}" fill="url(#shade)"/>
<path d="M196 210 C 205 160 300 150 330 185 C 352 212 350 330 330 380 C 312 425 238 430 218 395 C 196 355 188 260 196 210 Z" fill="#F4F7FB" opacity="${v.sheen}"/>
<path d="M300 72 C 330 120 345 170 342 220" stroke="#0B1020" stroke-opacity=".3" stroke-width="2" fill="none"/>
<path d="M356 300 C 384 340 384 392 354 432" stroke="#0B1020" stroke-opacity=".3" stroke-width="2" fill="none"/>
<rect x="176" y="226" width="194" height="54" rx="27" fill="url(#visor)" stroke="${v.visorStroke[0]}" stroke-opacity="${v.visorStroke[1]}" stroke-width="2"/>
<rect x="194" y="236" width="62" height="9" rx="4.5" fill="${v.bars[0][0]}" opacity="${v.bars[0][1]}"/>
<rect x="290" y="236" width="62" height="9" rx="4.5" fill="${v.bars[1][0]}" opacity="${v.bars[1][1]}"/>
<ellipse cx="228" cy="258" rx="18" ry="7" fill="${v.eyes[0][0]}" filter="url(#glow)"/>
<ellipse cx="228" cy="258" rx="14" ry="5" fill="${v.eyes[0][1]}"/>
<ellipse cx="318" cy="258" rx="18" ry="7" fill="${v.eyes[1][0]}" filter="url(#glow)"/>
<ellipse cx="318" cy="258" rx="14" ry="5" fill="${v.eyes[1][1]}"/>
<path d="M268 290 C 262 322 262 342 274 354" stroke="#0B1020" stroke-opacity=".25" stroke-width="3" fill="none"/>
<path d="${v.mouth}" stroke="#0B1020" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="420" cy="268" r="36" fill="#0B1222" stroke="#2B6FFF" stroke-width="3"/>
<circle cx="420" cy="268" r="25" fill="none" stroke="${BLUE}" stroke-width="8" filter="url(#glow)"/>
<circle cx="420" cy="268" r="25" fill="none" stroke="#CFF1FF" stroke-width="3"/>
<circle cx="420" cy="268" r="9" fill="${BLUE}"/>
<ellipse cx="248" cy="122" rx="70" ry="28" fill="#ffffff" opacity="${v.sheen}" transform="rotate(-22 248 122)"/>
</svg>
`;
}
