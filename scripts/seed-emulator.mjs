/**
 * Seeds the Firestore emulator with demo catalog data.
 *
 * Unlike scripts/seed.ts this needs no service-account key — it talks to the
 * emulator over its REST API, so it runs anywhere the emulator does. Used for
 * local development and for producing UI previews.
 *
 * Usage (emulator must already be running):
 *   node scripts/seed-emulator.mjs [project-id]
 *
 * If the Auth emulator is up too, it also creates two emulator-only accounts
 * (see DEMO_USERS) with a delivered order and reviews, so the review flow can
 * be tried end to end. These passwords exist only in the local emulator.
 */
const PROJECT = process.argv[2] ?? 'kidswear-local';
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
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
const ts = (ms) => ({ timestampValue: new Date(ms).toISOString() });
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

// Reviews by made-up buyers (their orders are not seeded — reviews are read
// without them). [productId, author, rating, text, featured, hidden]
const REVIEWS = [
  [
    'prod-1',
    'Dilnoza R.',
    5,
    'Mato juda yumshoq, qizim bayramda kiydi. Oʻlchami aniq keldi.',
    true,
  ],
  ['prod-1', 'Aziz T.', 4, 'Yaxshi koʻylak, yetkazish 2 kun oldi.'],
  ['prod-4', 'Malika S.', 5, 'Jinsi qalin, yuvgandan keyin ham rangi oʻchmadi.', true],
  ['prod-7', 'Sardor K.', 5, 'Qishga zoʻr kurtka — issiq va yengil.', true],
  ['prod-7', 'Gulnora A.', 3, 'Yaxshi, lekin yengi biroz uzun ekan.'],
  ['prod-10', 'Javohir M.', 4, 'Krossovka qulay, oʻgʻlim kun boʻyi kiyib yuribdi.', true],
  ['prod-12', 'Nodira X.', 5, 'Yozga ideal sandal.'],
  ['prod-12', 'Spam Bot', 1, 'Arzon telefonlar shu yerda!!!', false, true],
];

/** Mirrors @kidswear/core summarizeReviews (visible only, one decimal). */
const RATINGS = new Map();
for (const [productId, , rating, , , hidden] of REVIEWS) {
  if (hidden) continue;
  const r = RATINGS.get(productId) ?? { sum: 0, reviewCount: 0 };
  r.sum += rating;
  r.reviewCount += 1;
  r.rating = Math.round((r.sum / r.reviewCount) * 10) / 10;
  RATINGS.set(productId, r);
}

/** Emulator-only demo accounts. Never used outside the local emulator. */
const DEMO_USERS = {
  customer: { email: 'mijoz@kidswear.test', password: 'kidswear-demo', name: 'Ali Valiyev' },
  admin: { email: 'admin@kidswear.test', password: 'kidswear-demo', name: 'Admin' },
};

async function authCall(path, body) {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Creates (or finds) an emulator account and returns its uid; null without the Auth emulator. */
async function demoUser({ email, password, name }, claims) {
  try {
    await fetch(`http://${AUTH_HOST}/`);
  } catch {
    return null;
  }
  let uid;
  try {
    ({ localId: uid } = await authCall('accounts:signUp?key=demo', {
      email,
      password,
      displayName: name,
    }));
  } catch {
    const { users } = await authCall(`projects/${PROJECT}/accounts:lookup`, { email: [email] });
    uid = users[0].localId;
  }
  if (claims) {
    await authCall(`projects/${PROJECT}/accounts:update`, {
      localId: uid,
      customAttributes: JSON.stringify(claims),
    });
  }
  return uid;
}

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
      // Recounted from the seeded reviews below (as the admin "Recount ratings" does).
      rating: { doubleValue: RATINGS.get(id)?.rating ?? 0 },
      reviewCount: int(RATINGS.get(id)?.reviewCount ?? 0),
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

  // FAQ entries (Faza 8) for the /faq page.
  const FAQS = [
    ['Buyurtmani qanday beraman?', 'How do I place an order?', 'Mahsulotni savatga qoʻshing, manzilni tanlang va buyurtmani tasdiqlang.'],
    ['Toʻlov qanday amalga oshadi?', 'How does payment work?', 'Buyurtmaning 50% i oldindan toʻlanadi, qolgani yetkazib berilganda.'],
  ];
  for (const [i, [uz, en, answer]] of FAQS.entries()) {
    await put(`faqs/faq${i + 1}`, {
      id: str(`faq${i + 1}`),
      question: map({ uz: str(uz), en: str(en) }),
      answer: map({ uz: str(answer), en: str(answer) }),
      createdAt: ts(NOW),
      updatedAt: ts(NOW),
      order: int(i),
    });
  }
  console.log(`  ${FAQS.length} faqs`);

  // Card transfer (Faza 4). A fake, all-zero card number: never put a real
  // card in the repo — the admin sets the real one in Admin → Payment settings.
  await put('settings/payment', {
    transferEnabled: bool(true),
    cardNumber: str('8600000000000000'),
    cardHolder: str('KIDSWEAR TEST'),
    bank: str('Test bank'),
    note: str('Izohga buyurtma raqamini yozing'),
  });
  console.log('  settings/payment (transfer on, fake card 8600 0000 0000 0000)');

  // Reviews (Faza 5). Ids follow {orderId}_{productId}; the buyers' orders are
  // fictional, so nobody can edit these.
  let r = 0;
  for (const [productId, author, rating, text, featured, hidden] of REVIEWS) {
    const orderId = `seed-order-${++r}`;
    const at = NOW - r * 2 * 86_400_000;
    await put(`reviews/${orderId}_${productId}`, {
      productId: str(productId),
      userId: str(`seed-buyer-${r}`),
      orderId: str(orderId),
      authorName: str(author),
      rating: int(rating),
      text: str(text),
      status: str(hidden ? 'hidden' : 'visible'),
      ...(featured ? { featured: bool(true) } : {}),
      createdAt: ts(at),
      updatedAt: ts(at),
    });
  }
  console.log(`  ${REVIEWS.length} reviews (4 featured, 1 hidden)`);

  const customer = await demoUser(DEMO_USERS.customer);
  const admin = await demoUser(DEMO_USERS.admin, { role: 'admin' });
  if (customer && admin) {
    for (const [uid, user, role] of [
      [customer, DEMO_USERS.customer, 'customer'],
      [admin, DEMO_USERS.admin, 'admin'],
    ]) {
      await put(`users/${uid}`, {
        email: str(user.email),
        displayName: str(user.name),
        role: str(role),
        addresses: arr([]),
        createdAt: ts(NOW),
      });
    }
    // A delivered order with two products the demo customer has not reviewed.
    const item = (productId, name, price) =>
      map({
        productId: str(productId),
        name: str(name),
        image: str(`https://picsum.photos/seed/${productId}/600/750`),
        price: int(price),
        quantity: int(1),
        size: str('98'),
        color: str('oq'),
      });
    await put('orders/demo-delivered', {
      userId: str(customer),
      items: arr([
        item('prod-2', 'Gulli koʻylak', 215000),
        item('prod-8', 'Yengil kurtka', 280000),
      ]),
      subtotal: int(495000),
      depositAmount: int(262500),
      paidAmount: int(525000),
      total: int(525000),
      deliveryFee: int(30000),
      status: str('delivered'),
      payment: map({ provider: str('mock'), state: str('paid') }),
      stockApplied: bool(true),
      shippingAddress: map({
        id: str('addr-1'),
        fullName: str('Ali Valiyev'),
        phone: str('+998901234567'),
        region: str('tashkent-city'),
        district: str('Chilonzor'),
        street: str('Bunyodkor 12'),
      }),
      createdAt: ts(NOW - 10 * 86_400_000),
      updatedAt: ts(NOW - 3 * 86_400_000),
    });
    console.log(
      `  demo accounts: ${DEMO_USERS.customer.email} (delivered order), ${DEMO_USERS.admin.email}`,
    );
  } else {
    console.log('  Auth emulator not running — demo accounts and order skipped');
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
