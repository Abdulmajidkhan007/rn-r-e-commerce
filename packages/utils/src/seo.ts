/**
 * SEO helpers — pure builders for sitemap.xml, robots.txt and JSON-LD.
 * Shared by the web app (runtime tags) and scripts/generate-sitemap.ts
 * (deploy-time files), so both agree on URLs and structured data.
 */

export interface SitemapEntry {
  /** Path starting with "/", e.g. "/product/abc". */
  path: string;
  /** Epoch ms of the last change; omitted when unknown. */
  lastModified?: number;
  changeFrequency?: 'daily' | 'weekly' | 'monthly';
  /** 0.0–1.0. */
  priority?: number;
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

/** Strips trailing slashes so `siteUrl + path` never doubles them. */
export function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/, '');
}

/** Percent-encodes a path segment-wise (ids/slugs are ASCII, but be safe). */
function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => (segment === '' ? '' : encodeURIComponent(decodeURIComponent(segment))))
    .join('/');
}

function absoluteUrl(siteUrl: string, path: string): string {
  const [pathname = '', query] = path.split('?');
  const encoded = encodePath(pathname.startsWith('/') ? pathname : `/${pathname}`);
  return `${normalizeSiteUrl(siteUrl)}${encoded}${query ? `?${query}` : ''}`;
}

export function buildSitemapXml(siteUrl: string, entries: readonly SitemapEntry[]): string {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const entry of entries) {
    const loc = absoluteUrl(siteUrl, entry.path);
    if (seen.has(loc)) continue;
    seen.add(loc);
    const parts = [`    <loc>${escapeXml(loc)}</loc>`];
    if (entry.lastModified !== undefined) {
      parts.push(
        `    <lastmod>${new Date(entry.lastModified).toISOString().slice(0, 10)}</lastmod>`,
      );
    }
    if (entry.changeFrequency) parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
    if (entry.priority !== undefined)
      parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    urls.push(`  <url>\n${parts.join('\n')}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Paths that must not be indexed: private, transactional or admin pages. */
export const NOINDEX_PATHS = [
  '/admin',
  '/cart',
  '/checkout',
  '/profile',
  '/orders',
  '/favorites',
  '/login',
  '/register',
  '/forgot-password',
] as const;

export function buildRobotsTxt(siteUrl: string): string {
  const disallow = NOINDEX_PATHS.map((p) => `Disallow: ${p}`).join('\n');
  return `User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${normalizeSiteUrl(siteUrl)}/sitemap.xml\n`;
}

export type JsonLd = Record<string, unknown>;

export interface ProductJsonLdInput {
  url: string;
  name: string;
  description: string;
  images: readonly string[];
  /** Integer som. */
  price: number;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
  sku?: string;
}

export function buildProductJsonLd(input: ProductJsonLdInput): JsonLd {
  const ld: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: 'UZS',
      price: String(Math.round(input.price)),
      availability: input.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  if (input.images.length > 0) ld['image'] = [...input.images];
  if (input.sku) ld['sku'] = input.sku;
  if (input.reviewCount !== undefined && input.reviewCount > 0 && input.rating !== undefined) {
    ld['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: input.rating.toFixed(1),
      reviewCount: input.reviewCount,
    };
  }
  return ld;
}

export function buildOrganizationJsonLd(input: {
  name: string;
  url: string;
  logo: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    logo: input.logo,
  };
}

export function buildWebSiteJsonLd(input: { name: string; url: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  };
}

/**
 * Serialises JSON-LD for a `<script type="application/ld+json">` body. "<" is
 * escaped so product text can never close the script tag.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
