/**
 * Automated accessibility audit of the web storefront: axe-core (WCAG 2.0/2.1
 * A+AA, incl. colour contrast) on the main pages in light AND dark mode, plus a
 * keyboard-only walk through catalog → product → cart → checkout.
 *
 * Needs: Firestore+Auth emulators with seed data, the web app served
 * (vite dev or preview) and Playwright with Chromium. Not part of CI (the
 * emulator + browser stack is heavy there); run it locally:
 *
 *   npx firebase emulators:start --only firestore,auth --project kidswear-local &
 *   node scripts/seed-emulator.mjs kidswear-local
 *   (cd apps/web && VITE_USE_FIREBASE_EMULATORS=true npx vite --port 5173) &
 *   node scripts/a11y-audit.mjs [baseUrl]
 *
 * With the production CSP (Faza 12): build with the emulator env, serve it with
 * `node scripts/csp-smoke-server.mjs 4173` and pass http://127.0.0.1:4173.
 *
 * Exit code 1 when any violation or keyboard failure is found.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.argv[2] ?? 'http://localhost:5173';
const CUSTOMER = { email: 'mijoz@kidswear.test', password: 'kidswear-demo' };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

let failures = 0;
const log = (ok, msg) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};

async function setTheme(page, theme) {
  const current = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
  const isDark = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor !== 'rgb(255, 250, 248)',
  );
  if ((theme === 'dark') !== isDark) {
    await page
      .locator(
        // data-testid on MUI icons exists only in dev builds; the aria-label
        // (uz) also matches a production build (CSP smoke server).
        'button:has([data-testid="LightModeIcon"]), button:has([data-testid="DarkModeIcon"]), button[aria-label="Mavzuni almashtirish"]',
      )
      .first()
      .click();
    await page.waitForTimeout(400);
  }
  return current;
}

async function axe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(
    (tags) => globalThis.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
    TAGS,
  );
}

async function audit(page, name, path) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    await page.waitForTimeout(300);
    const { violations } = await axe(page);
    log(violations.length === 0, `axe ${name} [${theme}] — ${violations.length} violations`);
    for (const v of violations) {
      console.log(`      - ${v.id} (${v.impact}): ${v.help} ×${v.nodes.length}`);
      for (const n of v.nodes.slice(0, 3)) {
        const d = n.any[0]?.data;
        const extra = d?.fgColor
          ? ` [fg ${d.fgColor} bg ${d.bgColor} ratio ${d.contrastRatio} size ${d.fontSize}]`
          : '';
        console.log(`          ${n.target.join(' ').slice(-110)}${extra}`);
      }
    }
  }
}

/** Is there a visible focus indicator on the focused element? */
async function focusVisible(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const s = getComputedStyle(el);
    const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
    const shadow = s.boxShadow !== 'none';
    // MUI draws focus on a child ripple/overlay for some controls.
    const ripple = !!el.querySelector('.Mui-focusVisible, .MuiTouchRipple-rippleVisible');
    return (
      outline ||
      shadow ||
      ripple ||
      el.classList.contains('Mui-focusVisible') ||
      !!el.closest('.Mui-focused')
    );
  });
}

async function keyboardFlow(page) {
  await page.goto(BASE + '/catalog', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // 1. Tabbing reaches product links and every stop shows focus.
  let reached = null;
  let invisible = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        href: el?.getAttribute?.('href') ?? '',
        tag: el?.tagName,
        label: (el?.getAttribute?.('aria-label') || el?.textContent || '').trim().slice(0, 30),
      };
    });
    if (!(await focusVisible(page))) invisible.push(`${info.tag}:${info.label}`);
    if (info.href.startsWith('/product/')) {
      reached = info.href;
      break;
    }
  }
  log(reached !== null, `keyboard: Tab reaches a product link (${reached})`);
  log(
    invisible.length === 0,
    `keyboard: focus visible on every stop before it (${invisible.length} without: ${invisible.slice(0, 5).join(', ')})`,
  );
  if (!reached) return;

  // 2. Enter opens the product page.
  await page.keyboard.press('Enter');
  await page.waitForURL('**/product/**');
  await page.waitForSelector('h1');
  await page.waitForTimeout(2000);
  log(true, 'keyboard: Enter opens product page');

  // 3. Pick size/colour with Space, add to cart with Enter.
  const pick = async (groupSel) => {
    const btn = page.locator(`${groupSel}:not([disabled])`).first();
    if (await btn.count()) {
      await btn.focus();
      await page.keyboard.press('Space');
    }
  };
  await pick('button.MuiToggleButton-root:not(.Mui-disabled)');
  await pick('.MuiChip-root[role="button"]:not(.Mui-disabled)');
  const add = page.locator('button.MuiButton-sizeLarge.MuiButton-contained').first();
  await add.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  const cartBadge = await page
    .locator('a[href="/cart"] .MuiBadge-badge:not(.MuiBadge-invisible)')
    .count();
  log(
    cartBadge > 0,
    'keyboard: size/colour via Space + add to cart via Enter updates the cart badge',
  );

  // 4. Go to cart through the header link, then checkout.
  await page.locator('a[href="/cart"]').first().focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/cart');
  await page.waitForTimeout(1500);
  const checkout = page
    .locator('a[href="/checkout"], button:has-text("Buyurtma"), button:has-text("Checkout")')
    .first();
  log((await checkout.count()) > 0, 'keyboard: cart page offers a checkout control');
  await checkout.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  log(
    /\/checkout|\/login/.test(page.url()),
    `keyboard: checkout reachable (${new URL(page.url()).pathname})`,
  );
}

async function login(page) {
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(CUSTOMER.email);
  await page.locator('input[type="password"]').first().fill(CUSTOMER.password);
  await page.locator('input[type="password"]').first().press('Enter');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
// Run against scripts/csp-smoke-server.mjs to audit with the production CSP.
const cspErrors = [];
page.on('console', (m) => {
  if (/Content Security Policy|Refused to/i.test(m.text())) cspErrors.push(m.text().slice(0, 160));
});

await page.goto(BASE + '/catalog', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('a[href^="/product/"]', { timeout: 20000 });
const productHref = await page.locator('a[href^="/product/"]').first().getAttribute('href');

await keyboardFlow(page);

await audit(page, 'home', '/');
await audit(page, 'catalog', '/catalog');
await audit(page, 'product', productHref);
await audit(page, 'cart', '/cart');
await audit(page, 'faq', '/faq');
await audit(page, 'delivery', '/delivery');
await audit(page, 'blog', '/blog');
await audit(page, 'login', '/login');

await login(page);
await audit(page, 'checkout', '/checkout');

// lang attribute follows the UI language.
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
log(
  (await page.evaluate(() => document.documentElement.lang)) === 'uz',
  'html lang="uz" by default',
);

log(pageErrors.length === 0, `no uncaught page errors (${pageErrors.length})`);
log(cspErrors.length === 0, `no CSP errors in the console (${cspErrors.length})`);
for (const e of cspErrors.slice(0, 5)) console.log(`      - ${e}`);
await browser.close();
console.log(failures === 0 ? '\nALL OK' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 1 - 1 : 1);
