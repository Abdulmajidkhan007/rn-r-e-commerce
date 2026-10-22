/**
 * Seeds the Firestore emulator with demo catalog data.
 *
 * Unlike scripts/seed.ts this needs no service-account key — it talks to the
 * emulator over its REST API, so it runs anywhere the emulator does. Used for
 * local development and for producing UI previews.
 *
 * Usage (emulator must already be running):
 *   node scripts/seed-emulator.mjs [project-id]
 */
const PROJECT = process.argv[2] ?? 'kidswear-local';
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

// Mirrors @kidswear/utils.buildSearchTokens. Duplicated rather than imported so
// this stays a dependency-free script.
function buildTokens(...texts) {
  const tokens = new Set();
  for (const text of texts) {
    for (const value of Object.values(text ?? {})) {
      if (typeof value !== 'string' || !value) continue;
      const normalized = value
        .toLowerCase()
        .replace(/[ʻ‘’'`]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
      for (const word of normalized.split(' ').filter(Boolean)) {
        const limit = Math.min(word.length, 12);
        for (let n = 2; n <= limit; n++) tokens.add(word.slice(0, n));
        if (word.length < 2) tokens.add(word);
      }
    }
  }
  return [...tokens];
}

const str = (stringValue) => ({ stringValue });
const int = (n) => ({ integerValue: String(n) });
const bool = (booleanValue) => ({ booleanValue });
const arr = (values) => ({ arrayValue: { values } });
const map = (fields) => ({ mapValue: { fields } });
const localized = (uz, en, ru) => map({ uz: str(uz), en: str(en), ru: str(ru) });

const NOW = Date.now();

const CATEGORIES = [
  { id: 'cat-koylak', name: ['Koʻylaklar', 'Dresses', 'Платья'], slug: 'koylaklar', order: 1 },
  { id: 'cat-shim', name: ['Shimlar', 'Trousers', 'Брюки'], slug: 'shimlar', order: 2 },
  { id: 'cat-kurtka', name: ['Kurtkalar', 'Jackets', 'Куртки'], slug: 'kurtkalar', order: 3 },
  { id: 'cat-poyabzal', name: ['Poyabzallar', 'Shoes', 'Обувь'], slug: 'poyabzallar', order: 4 },
];

const PRODUCTS = [
  ['Yozgi koʻylak', 'Summer dress', 'Летнее платье', 'cat-koylak', 189000, 240000, 12],
  ['Gulli koʻylak', 'Floral dress', 'Платье в цветочек', 'cat-koylak', 215000, null, 4],
  ['Bayram koʻylagi', 'Party dress', 'Нарядное платье', 'cat-koylak', 320000, 390000, 7],
  ['Jinsi shim', 'Denim trousers', 'Джинсы', 'cat-shim', 165000, null, 20],
  ['Sport shim', 'Sport trousers', 'Спортивные брюки', 'cat-shim', 120000, 150000, 0],
  ['Klassik shim', 'Classic trousers', 'Классические брюки', 'cat-shim', 195000, null, 9],
  ['Qishki kurtka', 'Winter jacket', 'Зимняя куртка', 'cat-kurtka', 450000, 560000, 5],
  ['Yengil kurtka', 'Light jacket', 'Лёгкая куртка', 'cat-kurtka', 280000, null, 14],
  ['Yomgʻir kurtkasi', 'Rain jacket', 'Дождевик', 'cat-kurtka', 230000, null, 3],
  ['Krossovka', 'Sneakers', 'Кроссовки', 'cat-poyabzal', 340000, 420000, 11],
  ['Qishki botinka', 'Winter boots', 'Зимние ботинки', 'cat-poyabzal', 390000, null, 6],
  ['Sandal', 'Sandals', 'Сандалии', 'cat-poyabzal', 145000, 180000, 18],
];

const SIZES = ['92', '98', '104', '110'];
const COLORS = ['qora', 'oq'];
// Products listed here stay without `variants`, so the legacy path (one
// shared stock) is exercised next to the per-variant one.
const LEGACY_PRODUCTS = new Set(['prod-4', 'prod-11']);

// Mirrors @kidswear/core variantIdFor.
const variantIdFor = (size, color) => `${encodeURIComponent(size)}|${encodeURIComponent(color)}`;

/**
 * Deterministic per-variant stock: a mix of sold-out (0), low and plenty, so
 * the product page shows disabled combinations. The largest size of a dress
 * costs more, exercising a variant's own price. Product `stock` is the sum.
 */
function variantsFor(n, price, total) {
  const variants = [];
  let i = 0;
  for (const size of SIZES) {
    for (const color of COLORS) {
      const stock = total === 0 ? 0 : (n + i++) % 4 === 0 ? 0 : ((n * 7 + i) % 6) + 1;
      variants.push({
        id: variantIdFor(size, color),
        size,
        color,
        stock,
        ...(size === '110' && price > 200_000 ? { price: price + 20_000 } : {}),
        sku: `KW-${n}-${size}-${color}`.toUpperCase(),
      });
    }
  }
  return variants;
}

const variantValue = (v) =>
  map({
    id: str(v.id),
    size: str(v.size),
    color: str(v.color),
    stock: int(v.stock),
    ...(v.price ? { price: int(v.price) } : {}),
    sku: str(v.sku),
  });

async function put(path, fields) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PATCH',
    // The emulator treats 'owner' as a superuser token, bypassing rules —
    // seeding is an administrative action, not something a client may do.
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log(`Seeding ${PROJECT} on ${HOST}…`);

  for (const c of CATEGORIES) {
    await put(`categories/${c.id}`, {
      id: str(c.id),
      name: localized(...c.name),
      slug: str(c.slug),
      order: int(c.order),
    });
  }
  console.log(`  ${CATEGORIES.length} categories`);

  let n = 0;
  for (const [uz, en, ru, categoryId, price, compareAt, stock] of PRODUCTS) {
    const id = `prod-${++n}`;
    const name = { uz, en, ru };
    const variants = LEGACY_PRODUCTS.has(id) ? null : variantsFor(n, price, stock);
    await put(`products/${id}`, {
      id: str(id),
      name: localized(uz, en, ru),
      description: localized(
        `${uz} — paxtadan tikilgan, qulay va chidamli.`,
        `${en} — cotton, comfortable and durable.`,
        `${ru} — хлопок, удобно и практично.`,
      ),
      price: int(price),
      ...(compareAt ? { compareAtPrice: int(compareAt) } : {}),
      categoryId: str(categoryId),
      images: arr([str(`https://picsum.photos/seed/${id}/600/750`)]),
      sizes: arr(SIZES.map(str)),
      colors: arr(COLORS.map(str)),
      stock: int(variants ? variants.reduce((sum, v) => sum + v.stock, 0) : stock),
      ...(variants ? { variants: arr(variants.map(variantValue)), variantsExcluded: arr([]) } : {}),
      rating: { doubleValue: 4 + (n % 10) / 10 },
      reviewCount: int(n * 3),
      isActive: bool(true),
      searchTokens: arr(buildTokens(name).map(str)),
      createdAt: int(NOW - n * 86_400_000),
      updatedAt: int(NOW - n * 86_400_000),
    });
  }
  console.log(`  ${PRODUCTS.length} products`);

  // Delivery pricing with a minimum order, so the cart's "free delivery in X"
  // and the checkout/rules minimum (minOrderOk) are visible locally.
  await put('settings/delivery', {
    defaultFee: int(30000),
    regions: map({ 'tashkent-city': int(20000) }),
    freeFrom: int(500000),
    minOrder: int(100000),
  });
  console.log('  settings/delivery (minOrder 100 000, free from 500 000)');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
