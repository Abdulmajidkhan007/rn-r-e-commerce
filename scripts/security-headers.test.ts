import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hostingSourceMatches,
  parseCsp,
  readGlobalHeaders,
  readNetlifyHeaders,
  withExtraSources,
} from './lib/security-headers.ts';

const root = resolve(__dirname, '..');
const headers = readGlobalHeaders(resolve(root, 'firebase.json'));
const header = (key: string): string => {
  const found = headers.find((h) => h.key.toLowerCase() === key.toLowerCase());
  if (!found) throw new Error(`missing header ${key}`);
  return found.value;
};
const csp = parseCsp(header('Content-Security-Policy'));

describe('security headers (firebase.json)', () => {
  it('scripts: no inline, no eval, only self + Google auth/FCM loaders', () => {
    const scripts = csp.get('script-src') ?? [];
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts).not.toContain('https:');
    expect(scripts).not.toContain('*');
    expect(scripts).toEqual(["'self'", 'https://apis.google.com', 'https://www.gstatic.com']);
  });

  it('locks down plugins, base, framing and forms', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp.get('form-action')).toEqual(["'self'"]);
    expect(header('X-Frame-Options')).toBe('DENY');
  });

  it('allows the Firebase backends the SDK talks to', () => {
    expect(csp.get('connect-src')).toContain('https://*.googleapis.com');
    expect(csp.get('frame-src')).toContain('https://*.firebaseapp.com');
  });

  it('sends the remaining hardening headers', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header('Strict-Transport-Security')).toMatch(/^max-age=(\d+); includeSubDomains$/);
    const maxAge = Number(/max-age=(\d+)/.exec(header('Strict-Transport-Security'))?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    const permissions = header('Permissions-Policy');
    expect(permissions).toContain('camera=()');
    expect(permissions).toContain('geolocation=()');
    // /tv keeps the screen on.
    expect(permissions).toContain('screen-wake-lock=(self)');
    // Google sign-in uses a popup that must keep window.opener.
    expect(header('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
  });

  it('netlify.toml mirrors firebase.json exactly', () => {
    const netlify = readNetlifyHeaders(readFileSync(resolve(root, 'netlify.toml'), 'utf8'), '/*');
    expect(netlify).toEqual(headers);
  });
});

describe('security-headers helpers', () => {
  it('adds emulator origins only to the named directives', () => {
    const out = withExtraSources("default-src 'self'; connect-src 'self'", {
      'connect-src': ['http://127.0.0.1:8080'],
    });
    expect(out).toBe("default-src 'self'; connect-src 'self' http://127.0.0.1:8080");
  });

  it('matches firebase hosting sources', () => {
    expect(hostingSourceMatches('**', '/x')).toBe(true);
    expect(hostingSourceMatches('/assets/**', '/assets/a.js')).toBe(true);
    expect(hostingSourceMatches('/assets/**', '/x/a.js')).toBe(false);
    expect(hostingSourceMatches('/sw.js', '/sw.js')).toBe(true);
  });
});
