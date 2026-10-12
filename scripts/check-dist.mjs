/**
 * Post-build production gate. Fails the build when the output breaks a launch rule:
 *
 *  - inline executable <script>, inline <style> or style="" attributes (CSP has no 'unsafe-inline')
 *  - placeholder copy, known typos, or the contact address in plain text
 *  - internal links or #anchors that point nowhere
 *  - third-party resources (scripts, styles, fonts, images) - everything is self-hosted
 *  - files in /_astro that nothing references (unused assets)
 *  - first-load JavaScript over budget (30 KB compressed)
 *
 *   node scripts/check-dist.mjs [dir=dist]
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.argv[2] ?? 'dist');
const JS_BUDGET = 30 * 1024;
const FORBIDDEN_TEXT = [
  '[Name]',
  '[Role, Company]',
  '[A short, real quote',
  '[One or two sentences',
  'placeholders for real quotes',
  'Lets Build',
  'usmanaslam1002@gmail.com',
];

const errors = [];
const fail = (msg) => errors.push(msg);

async function walk(d) {
  const out = [];
  for (const entry of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(dir);
const rel = (f) => '/' + path.relative(dir, f).split(path.sep).join('/');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const textFiles = files.filter((f) => /\.(html|css|js|webmanifest|xml|txt|svg)$/.test(f));
const texts = new Map(await Promise.all(textFiles.map(async (f) => [f, await readFile(f, 'utf8')])));

const exists = async (urlPath) => {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  for (const candidate of [clean, `${clean}.html`, path.posix.join(clean, 'index.html')]) {
    try {
      if ((await stat(path.join(dir, candidate))).isFile()) return true;
    } catch {
      // try next
    }
  }
  return false;
};

for (const file of htmlFiles) {
  const html = texts.get(file);
  const name = rel(file);

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (/type="application\/ld\+json"/.test(attrs)) continue;
    if (!/\bsrc=/.test(attrs) || m[2].trim()) fail(`${name}: inline <script> (blocked by CSP)`);
  }
  if (/<style[\s>]/.test(html)) fail(`${name}: inline <style> (blocked by CSP)`);
  if (/\sstyle="/.test(html)) fail(`${name}: style="" attribute (blocked by CSP)`);
  for (const text of FORBIDDEN_TEXT) if (html.includes(text)) fail(`${name}: forbidden text "${text}"`);

  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/<(a|link|img|source|script)\b[^>]*?\s(href|src|srcset)="([^"]+)"/g)) {
    const [, tag, attr, raw] = m;
    const values = attr === 'srcset' ? raw.split(',').map((s) => s.trim().split(/\s+/)[0]) : [raw];
    for (const value of values) {
      if (value.startsWith('mailto:')) continue;
      if (/^https?:\/\//.test(value)) {
        const isPageLink = tag === 'a' || (tag === 'link' && /rel="canonical"/.test(m[0]));
        if (!isPageLink) fail(`${name}: third-party resource ${value}`);
        continue;
      }
      if (value.startsWith('#')) {
        if (value === '#' || !ids.has(value.slice(1))) fail(`${name}: dead anchor ${value}`);
        continue;
      }
      if (value.startsWith('/')) {
        const [p, hash] = value.split('#');
        if (!(await exists(p))) fail(`${name}: dead link ${value}`);
        if (hash && p === '/') {
          const home = texts.get(path.join(dir, 'index.html')) ?? '';
          if (!home.includes(`id="${hash}"`)) fail(`${name}: dead anchor ${value}`);
        }
      }
    }
  }
}

/* Unused assets: every hashed file must be referenced by some HTML/CSS/JS. */
const corpus = [...texts.values()].join('\n');
for (const file of files.filter((f) => rel(f).startsWith('/_astro/'))) {
  const base = path.basename(file);
  if (!corpus.includes(base)) fail(`unused asset ${rel(file)}`);
}

/* JS budget: all module scripts referenced by the home page, brotli-compressed. */
const home = texts.get(path.join(dir, 'index.html')) ?? '';
const seen = new Set();
const queue = [...home.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
let jsBytes = 0;
while (queue.length) {
  const src = queue.shift();
  if (seen.has(src)) continue;
  seen.add(src);
  const code = texts.get(path.join(dir, src));
  if (!code) continue;
  jsBytes += brotliCompressSync(code).length;
  for (const m of code.matchAll(/from\s*"(\.\/[^"]+\.js)"|import\s*"(\.\/[^"]+\.js)"/g)) {
    queue.push(path.posix.join(path.posix.dirname(src), m[1] ?? m[2]));
  }
}
if (jsBytes > JS_BUDGET) fail(`first-load JS ${(jsBytes / 1024).toFixed(1)} KB exceeds ${JS_BUDGET / 1024} KB`);

if (errors.length) {
  console.error(`check-dist: ${errors.length} problem(s) in ${path.relative(root, dir)}\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log(`check-dist: OK (${htmlFiles.length} pages, first-load JS ${(jsBytes / 1024).toFixed(1)} KB br)`);
