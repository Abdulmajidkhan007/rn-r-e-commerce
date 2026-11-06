/**
 * Security headers of the web storefront — read from `firebase.json`, the single
 * source of truth (`netlify.toml` mirrors it; a unit test keeps the two equal).
 *
 * Pure helpers, shared by the unit test and the local CSP smoke server.
 */
import { readFileSync } from 'node:fs';

export interface HeaderPair {
  key: string;
  value: string;
}

interface HostingHeaderRule {
  source: string;
  headers: HeaderPair[];
}

interface FirebaseJson {
  hosting: { headers: HostingHeaderRule[] };
}

/** Directive name → its source list, in declaration order. */
export type CspDirectives = Map<string, string[]>;

export function readHostingHeaderRules(firebaseJsonPath: string): HostingHeaderRule[] {
  const json = JSON.parse(readFileSync(firebaseJsonPath, 'utf8')) as FirebaseJson;
  return json.hosting.headers;
}

/** The headers sent with every response (the `"**"` rule). */
export function readGlobalHeaders(firebaseJsonPath: string): HeaderPair[] {
  const rule = readHostingHeaderRules(firebaseJsonPath).find((r) => r.source === '**');
  if (!rule) throw new Error('firebase.json: no hosting.headers rule with source "**"');
  return rule.headers;
}

export function parseCsp(policy: string): CspDirectives {
  const directives: CspDirectives = new Map();
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (!name) continue;
    directives.set(name.toLowerCase(), sources);
  }
  return directives;
}

export function serializeCsp(directives: CspDirectives): string {
  return [...directives].map(([name, sources]) => [name, ...sources].join(' ')).join('; ');
}

/**
 * Same policy plus the given origins in the listed directives — ONLY for the
 * local emulator smoke test (the SDK talks to http://127.0.0.1:8080/9099 there).
 * Everything else stays byte-identical to production.
 */
export function withExtraSources(
  policy: string,
  extra: Readonly<Record<string, readonly string[]>>,
): string {
  const directives = parseCsp(policy);
  for (const [name, sources] of Object.entries(extra)) {
    directives.set(name, [...(directives.get(name) ?? []), ...sources]);
  }
  return serializeCsp(directives);
}

/**
 * Minimal Firebase Hosting `source` glob matcher: `**` (anything), a trailing
 * `/**` (prefix) and exact paths — the only forms firebase.json uses.
 */
export function hostingSourceMatches(source: string, pathname: string): boolean {
  if (source === '**') return true;
  if (source.endsWith('/**')) return pathname.startsWith(source.slice(0, -2));
  return source === pathname;
}

/**
 * `[headers.values]` of the netlify.toml block `for = "<path>"` — a tiny reader
 * for the flat `Key = "value"` lines that file uses (no TOML dependency).
 */
export function readNetlifyHeaders(tomlText: string, forPath: string): HeaderPair[] {
  const blocks = tomlText.split(/^\[\[headers\]\]\s*$/m).slice(1);
  const block = blocks.find((b) =>
    new RegExp(`^\\s*for\\s*=\\s*"${forPath.replace(/[.*]/g, '\\$&')}"`, 'm').test(b),
  );
  if (!block) return [];
  const pairs: HeaderPair[] = [];
  for (const line of block.split('\n')) {
    const m = /^\s*([A-Za-z-]+)\s*=\s*(".*")\s*$/.exec(line);
    if (m?.[1] && m[2] && m[1] !== 'for') {
      pairs.push({ key: m[1], value: JSON.parse(m[2]) as string });
    }
  }
  return pairs;
}
