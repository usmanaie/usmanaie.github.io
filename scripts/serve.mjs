/**
 * Production-like static server for tests and Lighthouse CI.
 *
 * Mirrors Firebase Hosting behaviour from firebase.json: response headers (including the
 * CSP), cleanUrls, the custom 404 page, and Brotli/gzip compression, so e2e, axe and
 * Lighthouse run against what production actually serves.
 *
 *   node scripts/serve.mjs [dir=dist] [port=4173]
 */
import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? process.env.PORT ?? 4173);
const { hosting } = JSON.parse(readFileSync(path.join(root, 'firebase.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.txt', '.xml']);

/** Converts a Firebase glob (supports **, *, @(a|b)) into a RegExp. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      re += '.*';
      i += 1;
      if (glob[i + 1] === '/') i += 1;
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '@' && glob[i + 1] === '(') {
      const end = glob.indexOf(')', i);
      re += `(?:${glob.slice(i + 2, end)})`;
      i = end;
    } else re += ch.replace(/[.+^${}()|[\]\\?]/g, '\\$&');
  }
  return new RegExp(`^/?${re}$`);
}

/** Compressed bodies are cached like a CDN would, so measured TTFB reflects serving, not compressing. */
const compressedCache = new Map();
function compress(file, body, encoding) {
  const key = `${encoding}:${file}`;
  if (!compressedCache.has(key)) {
    compressedCache.set(
      key,
      encoding === 'br'
        ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
        : gzipSync(body, { level: 9 }),
    );
  }
  return compressedCache.get(key);
}

const rules = hosting.headers.map((rule) => ({ re: globToRegExp(rule.source), headers: rule.headers }));

function headersFor(urlPath) {
  const out = {};
  for (const rule of rules) {
    if (rule.re.test(urlPath)) for (const { key, value } of rule.headers) out[key] = value;
  }
  // Production is HTTPS-only, where upgrade-insecure-requests is a no-op. Over plain-http localhost,
  // WebKit would upgrade every subresource to https:// and fail, so drop just that directive locally.
  if (out['Content-Security-Policy']) {
    out['Content-Security-Policy'] = out['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
  }
  return out;
}

async function resolveFile(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const candidates = urlPath.endsWith('/')
    ? [path.join(clean, 'index.html')]
    : [clean, `${clean}.html`, path.join(clean, 'index.html')];
  for (const candidate of candidates) {
    const file = path.join(dir, candidate);
    if (!file.startsWith(dir)) return null;
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try next candidate
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // cleanUrls: /page.html redirects to /page
  if (url.pathname.endsWith('.html')) {
    const target = url.pathname.replace(/(index)?\.html$/, '') || '/';
    res.writeHead(301, { location: target });
    res.end();
    return;
  }

  let status = 200;
  let file = await resolveFile(url.pathname);
  if (!file) {
    status = 404;
    file = path.join(dir, '404.html');
  }

  let body;
  try {
    body = await readFile(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(file);
  const headers = {
    ...headersFor(url.pathname),
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    vary: 'Accept-Encoding',
  };
  const accept = String(req.headers['accept-encoding'] ?? '');
  if (COMPRESSIBLE.has(ext)) {
    if (accept.includes('br')) {
      body = compress(file, body, 'br');
      headers['content-encoding'] = 'br';
    } else if (accept.includes('gzip')) {
      body = compress(file, body, 'gzip');
      headers['content-encoding'] = 'gzip';
    }
  }
  headers['content-length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
});

server.listen(port, () => console.log(`Serving ${path.relative(root, dir)} at http://localhost:${port}`));
