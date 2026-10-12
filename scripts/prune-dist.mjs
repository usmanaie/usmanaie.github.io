/**
 * Removes hashed files in /_astro that no HTML, CSS or JS references.
 *
 * Astro/Vite emit a few artefacts that are never requested: the original of a
 * transformed image (only its AVIF/WebP/PNG derivatives are used) and the client
 * script of a component that is compiled but not rendered (the gated Reviews section).
 * Shipping them would only bloat the deploy, so they are pruned before check-dist runs.
 *
 *   node scripts/prune-dist.mjs [dir=dist]
 */
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.argv[2] ?? 'dist');

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
const textFiles = files.filter((f) => /\.(html|css|js|webmanifest|svg)$/.test(f));

// Iterate: removing an unused script can orphan the chunks only it imported.
let removed = [];
for (;;) {
  const live = files.filter((f) => !removed.includes(f));
  const corpus = (await Promise.all(textFiles.filter((f) => live.includes(f)).map((f) => readFile(f, 'utf8')))).join(
    '\n',
  );
  const orphans = live.filter((f) => f.includes(`${path.sep}_astro${path.sep}`) && !corpus.includes(path.basename(f)));
  if (orphans.length === 0) break;
  await Promise.all(orphans.map((f) => rm(f)));
  removed = [...removed, ...orphans];
}

for (const f of removed) console.log(`pruned ${path.relative(dir, f)}`);
