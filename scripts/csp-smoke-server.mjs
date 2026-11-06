/**
 * Serves a built web app (apps/web/dist) with the hosting headers from
 * firebase.json applied — like Firebase Hosting does — so the CSP can be
 * exercised locally against the emulators.
 *
 * The ONLY change from production: the local emulator origins are appended to
 * `connect-src` / `frame-src` (the SDK talks to http://127.0.0.1:8080/9099 in
 * emulator mode). Every other directive and header is byte-identical.
 *
 * Usage (after `VITE_USE_FIREBASE_EMULATORS=true npm run build -w @kidswear/web`):
 *   node scripts/csp-smoke-server.mjs [port=4173] [distDir=apps/web/dist]
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import {
  hostingSourceMatches,
  readHostingHeaderRules,
  withExtraSources,
} from './lib/security-headers.ts';

const PORT = Number(process.argv[2] ?? 4173);
const DIST = resolve(process.argv[3] ?? 'apps/web/dist');
const EMULATOR_ORIGINS = [
  'http://127.0.0.1:8080',
  'ws://127.0.0.1:8080',
  'http://127.0.0.1:9099',
  'http://127.0.0.1:9199',
];
const rules = readHostingHeaderRules(resolve('firebase.json'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.woff2': 'font/woff2',
};

function headersFor(pathname) {
  const out = {};
  for (const rule of rules) {
    if (!hostingSourceMatches(rule.source, pathname)) continue;
    for (const { key, value } of rule.headers) {
      out[key] =
        key === 'Content-Security-Policy'
          ? withExtraSources(value, {
              'connect-src': EMULATOR_ORIGINS,
              'frame-src': ['http://127.0.0.1:9099'],
            })
          : value;
    }
  }
  return out;
}

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let file = normalize(join(DIST, pathname));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(DIST, 'index.html'); // SPA rewrite, as in firebase.json
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    ...headersFor(pathname),
  });
  res.end(readFileSync(file));
}).listen(PORT, '127.0.0.1', () => {
  console.log(`CSP smoke server: http://127.0.0.1:${PORT} (dist: ${DIST})`);
});
