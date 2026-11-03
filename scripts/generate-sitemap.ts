/**
 * Writes sitemap.xml and robots.txt into apps/web/dist — run at deploy time,
 * after `vite build`, before `firebase deploy` (Spark has no Cloud Functions,
 * so the sitemap is static: it reflects the catalog at the moment of deploy).
 *
 * Includes: static pages, categories (/catalog?category=<id>), active
 * products (not draft, not trashed) and published blog posts.
 *
 * Usage:
 *   SITE_URL=https://example.web.app GOOGLE_APPLICATION_CREDENTIALS=./key.json \
 *     node scripts/generate-sitemap.ts [outDir]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Timestamp } from 'firebase-admin/firestore';
import { buildRobotsTxt, buildSitemapXml, type SitemapEntry } from '../packages/utils/src/seo.ts';

const STATIC_PAGES: SitemapEntry[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/catalog', changeFrequency: 'daily', priority: 0.9 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/delivery', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.2 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.2 },
];

const millis = (v: unknown): number | undefined =>
  v && typeof (v as Timestamp).toMillis === 'function' ? (v as Timestamp).toMillis() : undefined;

async function main(): Promise<void> {
  const siteUrl = process.env['SITE_URL'];
  if (!siteUrl) {
    console.error('SITE_URL is required (e.g. https://<project>.web.app)');
    process.exit(1);
  }
  const outDir = process.argv[2] ?? 'apps/web/dist';
  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? './service-account-key.json';
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount) });
  const db = getFirestore();

  const [categories, products, posts] = await Promise.all([
    db.collection('categories').get(),
    db.collection('products').where('isActive', '==', true).get(),
    db.collection('blogPosts').where('published', '==', true).get(),
  ]);

  const entries: SitemapEntry[] = [...STATIC_PAGES];
  for (const doc of categories.docs) {
    entries.push({
      path: `/catalog?category=${encodeURIComponent(doc.id)}`,
      changeFrequency: 'daily',
      priority: 0.7,
    });
  }
  let productCount = 0;
  for (const doc of products.docs) {
    const data = doc.data();
    if (data['isDraft'] === true || data['deletedAt'] !== undefined) continue;
    productCount++;
    const lastModified = millis(data['updatedAt']);
    entries.push({
      path: `/product/${doc.id}`,
      ...(lastModified !== undefined && { lastModified }),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }
  let postCount = 0;
  for (const doc of posts.docs) {
    const slug = doc.data()['slug'];
    if (typeof slug !== 'string') continue;
    postCount++;
    const lastModified = millis(doc.data()['updatedAt']);
    entries.push({
      path: `/blog/${slug}`,
      ...(lastModified !== undefined && { lastModified }),
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'sitemap.xml'), buildSitemapXml(siteUrl, entries));
  writeFileSync(join(outDir, 'robots.txt'), buildRobotsTxt(siteUrl));
  console.log(
    `✓ sitemap.xml: ${entries.length} URL (${productCount} mahsulot, ${categories.size} toifa, ${postCount} maqola) → ${outDir}`,
  );
}

void main();
