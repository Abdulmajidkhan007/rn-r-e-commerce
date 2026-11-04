/**
 * CSP smoke test: walks the storefront (and an admin page) served WITH the
 * production security headers and fails on any CSP violation, uncaught page
 * error or missing header. Also opens the Google sign-in popup (emulator).
 *
 *   npx firebase emulators:start --only firestore,auth --project kidswear-local &
 *   node scripts/seed-emulator.mjs kidswear-local
 *   (cd apps/web && VITE_USE_FIREBASE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=kidswear-local \
 *     VITE_FIREBASE_API_KEY=demo VITE_FIREBASE_AUTH_DOMAIN=127.0.0.1 npx vite build)
 *   node scripts/csp-smoke-server.mjs 4173 &
 *   node scripts/csp-smoke.mjs [baseUrl=http://127.0.0.1:4173]
 *
 * Not part of CI (emulator + browser are heavy there) — run before changing
 * the CSP. Exit code 1 on any failure.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const USERS = {
  customer: { email: 'mijoz@kidswear.test', password: 'kidswear-demo' },
  admin: { email: 'admin@kidswear.test', password: 'kidswear-demo' },
};
const REQUIRED_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
];

let failures = 0;
const log = (ok, msg) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

const browser = await chromium.launch();

/** Fresh context per role so sessions never leak between checks. */
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Record violations from inside the page — catches every directive, not
  // only the ones Chromium happens to print to the console.
  await ctx.addInitScript(() => {
    globalThis.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      globalThis.__csp.push(
        `${e.effectiveDirective} ← ${e.blockedURI || '(inline)'} @ ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`,
      );
    });
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to|Permissions-Policy|Unrecognized feature/i.test(t)) {
      problems.push(`console: ${t.slice(0, 200)}`);
    }
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
  return { ctx, page, problems };
}

async function visit(t, name, path, waitFor) {
  const res = await t.page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  if (waitFor) await t.page.waitForSelector(waitFor, { timeout: 20000 }).catch(() => {});
  await t.page.waitForTimeout(2000);
  const violations = await t.page.evaluate(() => globalThis.__csp ?? []);
  const all = [...violations.map((v) => `violation: ${v}`), ...t.problems.splice(0)];
  log(all.length === 0, `${name} (${path}) — ${all.length} CSP/console problems`);
  for (const p of all.slice(0, 8)) console.log(`      - ${p}`);
  return res;
}

async function login(t, user) {
  await t.page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await t.page.locator('input[type="email"], input[name="email"]').first().fill(user.email);
  await t.page.locator('input[type="password"]').first().fill(user.password);
  await t.page.locator('input[type="password"]').first().press('Enter');
  await t.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
}

// 1. Anonymous storefront.
const guest = await newPage();
const first = await visit(guest, 'home', '/', 'a[href^="/product/"]');
const headers = first?.headers() ?? {};
const missing = REQUIRED_HEADERS.filter((h) => !headers[h]);
log(missing.length === 0, `security headers present (missing: ${missing.join(', ') || 'none'})`);
await visit(guest, 'catalog', '/catalog', 'a[href^="/product/"]');
const productHref = await guest.page.locator('a[href^="/product/"]').first().getAttribute('href');
// Seed images are external (https://picsum.photos): `img-src https:` must let
// them through — any block would show up as a violation in `visit`.
await visit(guest, 'product', productHref ?? '/', 'h1');
for (const [name, path] of [
  ['cart', '/cart'],
  ['faq', '/faq'],
  ['delivery', '/delivery'],
  ['blog', '/blog'],
  ['contact', '/contact'],
  ['privacy', '/privacy'],
  ['tv', '/tv'],
]) {
  await visit(guest, name, path);
}

// 2. Google sign-in popup opens (emulator's auth handler) without CSP errors.
await visit(guest, 'login', '/login', 'button');
const google = guest.page.locator('button:has-text("Google")').first();
if (await google.count()) {
  const [popup] = await Promise.all([
    guest.page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
    google.click(),
  ]);
  await guest.page.waitForTimeout(2000);
  const violations = await guest.page.evaluate(() => globalThis.__csp ?? []);
  const all = [...violations, ...guest.problems.splice(0)];
  if (popup) {
    log(true, `Google sign-in popup opened (${new URL(popup.url()).host})`);
  } else {
    // The SDK first loads https://apis.google.com/js/api.js. Without internet
    // (sandboxed CI) that load fails at the network level — not a CSP block,
    // which would be listed as a violation below.
    console.log('SKIP  Google sign-in popup did not open (apis.google.com unreachable?)');
  }
  log(all.length === 0, `Google sign-in click — ${all.length} CSP/console problems`);
  for (const p of all.slice(0, 8)) console.log(`      - ${p}`);
  await popup?.close();
} else {
  log(false, 'Google sign-in button not found on /login');
}
await guest.ctx.close();

// 3. Signed-in customer.
const customer = await newPage();
await login(customer, USERS.customer);
await visit(customer, 'checkout', '/checkout');
await visit(customer, 'orders', '/orders');
await visit(customer, 'profile', '/profile');
await customer.ctx.close();

// 4. Admin (charts, tables, image tools).
const admin = await newPage();
await login(admin, USERS.admin);
await visit(admin, 'admin dashboard', '/admin');
await visit(admin, 'admin products', '/admin/products');
await visit(admin, 'admin orders', '/admin/orders');
await admin.ctx.close();

await browser.close();
console.log(failures === 0 ? '\nALL OK' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
