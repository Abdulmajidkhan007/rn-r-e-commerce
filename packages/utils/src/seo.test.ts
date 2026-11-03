import { describe, expect, it } from 'vitest';
import { buildProductJsonLd, buildRobotsTxt, buildSitemapXml, serializeJsonLd } from './seo';

describe('buildSitemapXml', () => {
  const xml = buildSitemapXml('https://shop.example/', [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/product/a&b', lastModified: Date.UTC(2026, 9, 31, 12) },
    { path: '/catalog?category=cat-1' },
    { path: '/' },
  ]);

  it('uses absolute urls without doubled slashes', () => {
    expect(xml).toContain('<loc>https://shop.example/</loc>');
    expect(xml).not.toContain('example//');
  });
  it('escapes XML and percent-encodes path segments', () => {
    expect(xml).toContain('<loc>https://shop.example/product/a%26b</loc>');
    expect(xml).toContain('<loc>https://shop.example/catalog?category=cat-1</loc>');
  });
  it('writes lastmod as a date and de-duplicates', () => {
    expect(xml).toContain('<lastmod>2026-10-31</lastmod>');
    expect(xml.match(/<url>/g)).toHaveLength(3);
  });
});

describe('buildRobotsTxt', () => {
  it('points at the absolute sitemap and blocks private paths', () => {
    const txt = buildRobotsTxt('https://shop.example/');
    expect(txt).toContain('Sitemap: https://shop.example/sitemap.xml');
    expect(txt).toContain('Disallow: /admin');
    expect(txt).toContain('Disallow: /checkout');
  });
});

describe('buildProductJsonLd', () => {
  const base = {
    url: 'https://shop.example/product/p1',
    name: 'Kurtka',
    description: 'Issiq',
    images: ['https://img/1.webp'],
    price: 150000,
    inStock: true,
  };
  it('describes a Product with a UZS Offer', () => {
    const ld = buildProductJsonLd(base) as { '@type': string; offers: Record<string, string> };
    expect(ld['@type']).toBe('Product');
    expect(ld.offers['priceCurrency']).toBe('UZS');
    expect(ld.offers['price']).toBe('150000');
    expect(ld.offers['availability']).toBe('https://schema.org/InStock');
  });
  it('marks out of stock and omits rating without reviews', () => {
    const ld = buildProductJsonLd({ ...base, inStock: false, rating: 0, reviewCount: 0 });
    expect(JSON.stringify(ld)).toContain('OutOfStock');
    expect(ld).not.toHaveProperty('aggregateRating');
  });
  it('adds aggregateRating when reviewed', () => {
    const ld = buildProductJsonLd({ ...base, rating: 4.5, reviewCount: 3 });
    expect(ld).toHaveProperty('aggregateRating');
  });
});

describe('serializeJsonLd', () => {
  it('cannot close the script tag', () => {
    expect(serializeJsonLd({ a: '</script><b>' })).not.toContain('</script>');
  });
});
