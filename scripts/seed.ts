/**
 * Seeds Firestore with demo categories and products for the KidsWear catalog.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json node scripts/seed.ts
 *
 * The service-account key is a SECRET — gitignored, never commit it. Product
 * images are placeholder URLs (picsum.photos); real images arrive in the
 * admin/image phase. Re-running overwrites the same demo docs (stable ids).
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface Localized {
  uz: string;
  en: string;
  ru: string;
}

const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? './service-account-key.json';
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const categories: { id: string; name: Localized; slug: string; order: number }[] = [
  {
    id: 'cat-tshirts',
    name: { uz: 'Futbolkalar', en: 'T-shirts', ru: 'Футболки' },
    slug: 't-shirts',
    order: 1,
  },
  {
    id: 'cat-dresses',
    name: { uz: 'Koʻylaklar', en: 'Dresses', ru: 'Платья' },
    slug: 'dresses',
    order: 2,
  },
  {
    id: 'cat-outerwear',
    name: { uz: 'Ustki kiyim', en: 'Outerwear', ru: 'Верхняя одежда' },
    slug: 'outerwear',
    order: 3,
  },
  { id: 'cat-shoes', name: { uz: 'Poyabzal', en: 'Shoes', ru: 'Обувь' }, slug: 'shoes', order: 4 },
  {
    id: 'cat-accessories',
    name: { uz: 'Aksessuarlar', en: 'Accessories', ru: 'Аксессуары' },
    slug: 'accessories',
    order: 5,
  },
];

const SIZES = ['1-2y', '3-4y', '5-6y', '7-8y'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'pink'];
const STOCKS = [20, 12, 0, 3, 8]; // mix of in-stock / out / low

function imagesFor(id: string): string[] {
  return [1, 2, 3].map((n) => `https://picsum.photos/seed/${id}-${n}/600/800`);
}

async function seed(): Promise<void> {
  const now = Timestamp.now();
  const batch = db.batch();

  for (const c of categories) {
    batch.set(db.collection('categories').doc(c.id), {
      name: c.name,
      slug: c.slug,
      order: c.order,
      parentId: null,
      imageUrl: `https://picsum.photos/seed/${c.id}/400/400`,
    });
  }

  let n = 0;
  for (const c of categories) {
    for (let i = 1; i <= 3; i++) {
      n += 1;
      const id = `prod-${c.slug}-${i}`;
      const price = 80000 + n * 15000;
      batch.set(db.collection('products').doc(id), {
        name: {
          uz: `${c.name.uz} ${i}`,
          en: `${c.name.en} ${i}`,
          ru: `${c.name.ru} ${i}`,
        },
        description: {
          uz: 'Bolalar uchun qulay va sifatli kiyim.',
          en: 'Comfortable, high-quality clothing for kids.',
          ru: 'Удобная и качественная одежда для детей.',
        },
        price,
        ...(i === 1 ? { compareAtPrice: price + 40000 } : {}),
        categoryId: c.id,
        images: imagesFor(id),
        sizes: SIZES,
        colors: COLORS.slice(0, 3),
        stock: STOCKS[n % STOCKS.length],
        rating: 3.5 + (n % 3) * 0.5,
        reviewCount: (n * 7) % 50,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  console.log(`✓ Seeded ${categories.length} categories and ${n} products.`);
}

void seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
