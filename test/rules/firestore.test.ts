import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { ProductImageSchema } from '../../packages/core/src/productImage';
import { createConverter } from '../../packages/firebase/src/converters';

/**
 * Exercises firestore.rules against the emulator. These are the only tests that
 * cover the server-side authorization boundary — everything else in the suite
 * runs on the client side of it.
 */

const CUSTOMER = 'customer-uid';
const OTHER = 'other-uid';
const ADMIN = 'admin-uid';

let testEnv: RulesTestEnvironment;

const address = {
  fullName: 'Ali Valiyev',
  phone: '+998901234567',
  region: 'Toshkent',
  district: 'Chilonzor',
  street: 'Bunyodkor 12',
};

function orderData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId: CUSTOMER,
    items: [{ productId: 'p1', quantity: 1, price: 100_000 }],
    subtotal: 100_000,
    depositAmount: 50_000,
    paidAmount: 50_000,
    total: 100_000,
    status: 'deposit_paid',
    payment: { provider: 'mock', state: 'paid' },
    shippingAddress: address,
    ...overrides,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'kidswear-rules-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Admin authority is the custom claim `role: 'admin'`, mirroring production. */
const customerDb = () => testEnv.authenticatedContext(CUSTOMER).firestore();
const otherDb = () => testEnv.authenticatedContext(OTHER).firestore();
const adminDb = () => testEnv.authenticatedContext(ADMIN, { role: 'admin' }).firestore();
const anonDb = () => testEnv.unauthenticatedContext().firestore();

describe('products & categories', () => {
  it('are publicly readable — the catalog works signed out', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'products/p1'), { name: { uz: 'X' }, price: 1000 });
    });
    await assertSucceeds(getDoc(doc(anonDb(), 'products/p1')));
  });

  it('reject writes from a signed-in non-admin', async () => {
    await assertFails(setDoc(doc(customerDb(), 'products/p1'), { price: 1 }));
    await assertFails(setDoc(doc(customerDb(), 'categories/c1'), { slug: 'x' }));
  });

  it('reject writes from anonymous users', async () => {
    await assertFails(setDoc(doc(anonDb(), 'products/p1'), { price: 1 }));
  });

  it('allow admin writes', async () => {
    await assertSucceeds(setDoc(doc(adminDb(), 'products/p1'), { price: 1000 }));
    await assertSucceeds(setDoc(doc(adminDb(), 'categories/c1'), { slug: 'x' }));
  });

  it('block a client stock decrement — that is the Functions job', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'products/p1'), { stock: 10 });
    });
    await assertFails(updateDoc(doc(customerDb(), 'products/p1'), { stock: 9 }));
  });

  it('keep catalog admin actions (draft, soft delete, restore, bulk write) admin-only', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'products/p1'), { isActive: true, categoryId: 'c1' });
    });
    for (const patch of [{ isDraft: false }, { deletedAt: 1 }, { isActive: true }]) {
      await assertFails(updateDoc(doc(customerDb(), 'products/p1'), patch));
      await assertFails(updateDoc(doc(anonDb(), 'products/p1'), patch));
    }
    await assertSucceeds(
      updateDoc(doc(adminDb(), 'products/p1'), { deletedAt: 1, isActive: false }),
    );
    await assertSucceeds(updateDoc(doc(adminDb(), 'products/p1'), { isDraft: true }));
    await assertSucceeds(
      (async () => {
        const db = adminDb();
        const batch = writeBatch(db);
        batch.update(doc(db, 'products/p1'), { categoryId: 'c2' });
        await batch.commit();
      })(),
    );
    // A customer cannot hard-delete a trashed product either.
    await assertFails(deleteDoc(doc(customerDb(), 'products/p1')));
  });
});

describe('productImages — Spark photo storage', () => {
  // ~300 KB JPEG as base64: the size a real compressed product photo lands at.
  const dataUrl = `data:image/jpeg;base64,${'A'.repeat(400_000)}`;
  // The exact shape `saveProductImage` writes: the shared converter strips the
  // id and stamps both timestamps.
  const image = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    productId: 'p1',
    dataUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  });

  it('lets an admin store a compressed photo, readable by anyone', async () => {
    await assertSucceeds(setDoc(doc(adminDb(), 'productImages/i1'), image()));
    await assertSucceeds(getDoc(doc(anonDb(), 'productImages/i1')));
  });

  it('accepts the document the app writes through the shared converter', async () => {
    const ref = doc(collection(adminDb(), 'productImages')).withConverter(
      createConverter(ProductImageSchema),
    );
    await assertSucceeds(
      setDoc(ref, { id: ref.id, productId: 'p1', dataUrl, createdAt: serverTimestamp() }),
    );
  });

  it('rejects photos from customers and anonymous users', async () => {
    await assertFails(setDoc(doc(customerDb(), 'productImages/i1'), image()));
    await assertFails(setDoc(doc(anonDb(), 'productImages/i1'), image()));
  });

  it('rejects anything over the size cap or that is not a base64 image', async () => {
    const tooBig = `data:image/jpeg;base64,${'A'.repeat(420_000)}`;
    await assertFails(setDoc(doc(adminDb(), 'productImages/i1'), image({ dataUrl: tooBig })));
    await assertFails(
      setDoc(doc(adminDb(), 'productImages/i2'), image({ dataUrl: 'https://x.test/a.jpg' })),
    );
    await assertFails(
      setDoc(
        doc(adminDb(), 'productImages/i3'),
        image({ dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' }),
      ),
    );
  });

  it('rejects extra fields and a client-chosen timestamp', async () => {
    await assertFails(setDoc(doc(adminDb(), 'productImages/i1'), image({ extra: 1 })));
    await assertFails(setDoc(doc(adminDb(), 'productImages/i2'), image({ createdAt: 1 })));
  });

  it('is immutable but deletable by an admin', async () => {
    await assertSucceeds(setDoc(doc(adminDb(), 'productImages/i1'), image()));
    await assertFails(
      updateDoc(doc(adminDb(), 'productImages/i1'), {
        dataUrl: 'data:image/jpeg;base64,AAAA',
      }),
    );
    await assertFails(deleteDoc(doc(customerDb(), 'productImages/i1')));
    await assertSucceeds(deleteDoc(doc(adminDb(), 'productImages/i1')));
  });
});

describe('orders — create', () => {
  it('allows a customer to create their own deposit_paid order', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o1'), orderData()));
  });

  it('rejects creating an order for someone else', async () => {
    await assertFails(setDoc(doc(customerDb(), 'orders/o1'), orderData({ userId: OTHER })));
  });

  it('rejects deposit_paid when paidAmount does not match the deposit', async () => {
    // The core money invariant: a client must not mark itself paid for less.
    await assertFails(setDoc(doc(customerDb(), 'orders/o1'), orderData({ paidAmount: 0 })));
    await assertFails(setDoc(doc(customerDb(), 'orders/o1'), orderData({ paidAmount: 1 })));
  });

  it('requires a pending order to be unpaid', async () => {
    await assertSucceeds(
      setDoc(doc(customerDb(), 'orders/o2'), orderData({ status: 'pending', paidAmount: 0 })),
    );
    await assertFails(
      setDoc(doc(customerDb(), 'orders/o3'), orderData({ status: 'pending', paidAmount: 50_000 })),
    );
  });

  it('rejects creating an order already in a fulfilment state', async () => {
    for (const status of ['processing', 'shipped', 'delivered', 'cancelled']) {
      await assertFails(setDoc(doc(customerDb(), 'orders/ox'), orderData({ status })));
    }
  });

  it('rejects an order missing required fields', async () => {
    const { shippingAddress: _omit, ...noAddress } = orderData();
    await assertFails(setDoc(doc(customerDb(), 'orders/o1'), noAddress));
  });

  it('rejects anonymous order creation', async () => {
    await assertFails(setDoc(doc(anonDb(), 'orders/o1'), orderData()));
  });

  it('rejects a client claiming a hosted-gateway payment', async () => {
    // Payme and Click confirm server-side. A client that could create its own
    // deposit_paid order with provider 'payme' would get free goods.
    for (const provider of ['payme', 'click']) {
      await assertFails(
        setDoc(
          doc(customerDb(), 'orders/ohosted'),
          orderData({ payment: { provider, state: 'paid' } }),
        ),
      );
    }
  });

  it('rejects a paid order with no payment block at all', async () => {
    const { payment: _omit, ...noPayment } = orderData();
    await assertFails(setDoc(doc(customerDb(), 'orders/onp'), noPayment));
  });

  it('allows a pending hosted-gateway order — the webhook settles it later', async () => {
    await assertSucceeds(
      setDoc(
        doc(customerDb(), 'orders/opending'),
        orderData({
          status: 'pending',
          paidAmount: 0,
          payment: { provider: 'payme', state: 'created' },
        }),
      ),
    );
  });
});

describe('product variants', () => {
  const variants = [
    { id: 'S|Red', size: 'S', color: 'Red', stock: 3 },
    { id: 'M|Red', size: 'M', color: 'Red', stock: 0, price: 120_000, sku: 'KW-M-R' },
  ];
  const variantLines = [
    { productId: 'p1', variantId: 'S|Red', size: 'S', color: 'Red', quantity: 1, price: 100_000 },
    { productId: 'p1', variantId: 'M|Red', size: 'M', color: 'Red', quantity: 1, price: 120_000 },
  ];

  it('lets an admin write a product with variants', async () => {
    await assertSucceeds(
      setDoc(doc(adminDb(), 'products/p1'), {
        price: 100_000,
        stock: 3,
        sizes: ['S', 'M'],
        colors: ['Red'],
        variants,
        variantsExcluded: [],
      }),
    );
  });

  it('blocks a customer from touching variant stock', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'products/p1'), { stock: 3, variants });
    });
    await assertFails(
      updateDoc(doc(customerDb(), 'products/p1'), {
        variants: variants.map((v) => ({ ...v, stock: 99 })),
      }),
    );
  });

  it('accepts an order whose lines carry variantId — totals still checked', async () => {
    const order = orderData({
      items: variantLines,
      subtotal: 220_000,
      total: 220_000,
      depositAmount: 110_000,
      paidAmount: 110_000,
    });
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/ov1'), order));
    await assertFails(setDoc(doc(customerDb(), 'orders/ov2'), { ...order, total: 100_000 }));
  });

  it('still accepts a pre-variant line without variantId', async () => {
    await assertSucceeds(
      setDoc(
        doc(customerDb(), 'orders/olegacy'),
        orderData({
          items: [{ productId: 'p1', size: 'S', color: 'Red', quantity: 1, price: 100_000 }],
        }),
      ),
    );
  });
});

describe('orders — read', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'orders/o1'), orderData());
    });
  });

  it('lets the owner read their order', async () => {
    await assertSucceeds(getDoc(doc(customerDb(), 'orders/o1')));
  });

  it('lets an admin read any order', async () => {
    await assertSucceeds(getDoc(doc(adminDb(), 'orders/o1')));
  });

  it('hides an order from a different customer', async () => {
    await assertFails(getDoc(doc(otherDb(), 'orders/o1')));
  });

  it('hides orders from anonymous users', async () => {
    await assertFails(getDoc(doc(anonDb(), 'orders/o1')));
  });
});

describe('orders — update', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'orders/o1'),
        orderData({ status: 'pending', paidAmount: 0 }),
      );
      await setDoc(doc(ctx.firestore(), 'orders/paid'), orderData());
    });
  });

  const customerCancel = { status: 'cancelled', cancelReason: 'customer' };

  it('lets the owner cancel their pending order', async () => {
    await assertSucceeds(
      updateDoc(doc(customerDb(), 'orders/o1'), {
        ...customerCancel,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('requires cancelReason "customer" on an owner cancel', async () => {
    await assertFails(updateDoc(doc(customerDb(), 'orders/o1'), { status: 'cancelled' }));
    await assertFails(
      updateDoc(doc(customerDb(), 'orders/o1'), { status: 'cancelled', cancelReason: 'admin' }),
    );
  });

  it('stops the owner from cancelling once the deposit is paid', async () => {
    await assertFails(updateDoc(doc(customerDb(), 'orders/paid'), customerCancel));
  });

  it('stops the owner from changing status to anything but cancelled', async () => {
    await assertFails(updateDoc(doc(customerDb(), 'orders/o1'), { status: 'processing' }));
    await assertFails(updateDoc(doc(customerDb(), 'orders/o1'), { status: 'delivered' }));
  });

  it('stops the owner from editing anything else while cancelling', async () => {
    // Status-only change: smuggling a refund or the stock flag past the rules must fail.
    await assertFails(
      updateDoc(doc(customerDb(), 'orders/o1'), { ...customerCancel, paidAmount: 0, total: 1 }),
    );
    await assertFails(
      updateDoc(doc(customerDb(), 'orders/o1'), { ...customerCancel, stockApplied: true }),
    );
  });

  it('stops a different customer from cancelling', async () => {
    await assertFails(updateDoc(doc(otherDb(), 'orders/o1'), customerCancel));
  });

  it('lets an admin move the order through fulfilment', async () => {
    await assertSucceeds(updateDoc(doc(adminDb(), 'orders/paid'), { status: 'shipped' }));
  });

  it('stops the owner from cancelling once it has shipped', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'orders/o2'), orderData({ status: 'shipped' }));
    });
    await assertFails(updateDoc(doc(customerDb(), 'orders/o2'), customerCancel));
  });

  it('never allows deletion, even by an admin', async () => {
    await assertFails(deleteDoc(doc(customerDb(), 'orders/o1')));
    await assertFails(deleteDoc(doc(adminDb(), 'orders/o1')));
  });

  it('rejects an order created with the stock flag or a cancel reason', async () => {
    await assertFails(setDoc(doc(customerDb(), 'orders/n1'), orderData({ stockApplied: true })));
    await assertFails(
      setDoc(doc(customerDb(), 'orders/n2'), orderData({ cancelReason: 'customer' })),
    );
  });
});

describe('stock journal & admin stock transaction', () => {
  const move = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    productId: 'p1',
    variantId: 'default',
    delta: -1,
    reason: 'sale',
    orderId: 'o1',
    by: ADMIN,
    createdAt: serverTimestamp(),
    ...over,
  });

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'products/p1'), { stock: 5 });
      await setDoc(doc(ctx.firestore(), 'orders/o1'), orderData());
      await setDoc(doc(ctx.firestore(), 'stockMoves/m0'), { ...move(), createdAt: 1 });
    });
  });

  it('a customer can neither write nor read the journal', async () => {
    await assertFails(setDoc(doc(customerDb(), 'stockMoves/m1'), move({ by: CUSTOMER })));
    await assertFails(getDoc(doc(customerDb(), 'stockMoves/m0')));
    await assertFails(getDocs(collection(customerDb(), 'stockMoves')));
  });

  it('a customer cannot take stock or flag an order as stocked', async () => {
    await assertFails(updateDoc(doc(customerDb(), 'products/p1'), { stock: 4 }));
    await assertFails(updateDoc(doc(customerDb(), 'orders/o1'), { stockApplied: true }));
  });

  it('an admin appends rows; nobody edits or deletes them', async () => {
    await assertSucceeds(setDoc(doc(adminDb(), 'stockMoves/m1'), move()));
    await assertSucceeds(getDocs(collection(adminDb(), 'stockMoves')));
    await assertFails(updateDoc(doc(adminDb(), 'stockMoves/m0'), { delta: -2 }));
    await assertFails(deleteDoc(doc(adminDb(), 'stockMoves/m0')));
  });

  it('rejects malformed rows, even from an admin', async () => {
    await assertFails(setDoc(doc(adminDb(), 'stockMoves/a'), move({ reason: 'gift' })));
    await assertFails(setDoc(doc(adminDb(), 'stockMoves/b'), move({ delta: 0 })));
    await assertFails(setDoc(doc(adminDb(), 'stockMoves/c'), move({ delta: 1.5 })));
    await assertFails(setDoc(doc(adminDb(), 'stockMoves/d'), move({ by: CUSTOMER })));
    await assertFails(setDoc(doc(adminDb(), 'stockMoves/e'), move({ createdAt: 1 })));
    await assertFails(setDoc(doc(adminDb(), 'stockMoves/f'), move({ extra: true })));
  });

  it("passes the admin's confirm transaction: stock, journal and flag together", async () => {
    const db = adminDb();
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        const order = await tx.get(doc(db, 'orders/o1'));
        const product = await tx.get(doc(db, 'products/p1'));
        if (order.get('stockApplied') === true) return;
        tx.update(doc(db, 'products/p1'), { stock: Number(product.get('stock')) - 1 });
        tx.set(doc(collection(db, 'stockMoves')), move());
        tx.update(doc(db, 'orders/o1'), { status: 'processing', stockApplied: true });
      }),
    );
    let after: unknown;
    // withSecurityRulesDisabled resolves to void, so read through a closure.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      after = (await getDoc(doc(ctx.firestore(), 'products/p1'))).get('stock');
    });
    if (after !== 4) throw new Error(`expected stock 4, got ${after}`);
  });
});

describe('users', () => {
  const profile = {
    uid: CUSTOMER,
    email: 'a@b.com',
    displayName: 'Ali',
    role: 'customer',
    addresses: [],
  };

  it('lets a user create their own customer profile', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), `users/${CUSTOMER}`), profile));
  });

  it('stops a user from self-assigning the admin role on create', async () => {
    await assertFails(
      setDoc(doc(customerDb(), `users/${CUSTOMER}`), { ...profile, role: 'admin' }),
    );
  });

  it('stops a user from escalating their role on update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${CUSTOMER}`), profile);
    });
    await assertFails(updateDoc(doc(customerDb(), `users/${CUSTOMER}`), { role: 'admin' }));
  });

  it('lets a user edit their own non-role fields', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${CUSTOMER}`), profile);
    });
    await assertSucceeds(updateDoc(doc(customerDb(), `users/${CUSTOMER}`), { displayName: 'B' }));
  });

  it('stops a user from creating or reading another profile', async () => {
    await assertFails(setDoc(doc(otherDb(), `users/${CUSTOMER}`), profile));
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${CUSTOMER}`), profile);
    });
    await assertFails(getDoc(doc(otherDb(), `users/${CUSTOMER}`)));
  });

  it('lets an admin read any profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${CUSTOMER}`), profile);
    });
    await assertSucceeds(getDoc(doc(adminDb(), `users/${CUSTOMER}`)));
  });

  it('never allows profile deletion', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${CUSTOMER}`), profile);
    });
    await assertFails(deleteDoc(doc(customerDb(), `users/${CUSTOMER}`)));
  });
});

describe('unknown collections', () => {
  it('are denied by the catch-all rule', async () => {
    await assertFails(setDoc(doc(customerDb(), 'secrets/s1'), { x: 1 }));
    await assertFails(getDoc(doc(adminDb(), 'secrets/s1')));
  });
});

// ---------------------------------------------------------------------------
// 1-guruh features (2026-10-09): promo, delivery, contact, blog, favorites.
// ---------------------------------------------------------------------------

async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

const promo = (over: Record<string, unknown> = {}) => ({
  type: 'percent',
  value: 10,
  minSubtotal: 0,
  active: true,
  ...over,
});

describe('orders — promo code', () => {
  it('accepts the exact percent discount and rejects a made-up one', async () => {
    await seed('promoCodes/BOLA10', promo());
    const ok = orderData({
      promoCode: 'BOLA10',
      discount: 10_000,
      total: 90_000,
      depositAmount: 45_000,
      paidAmount: 45_000,
    });
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o1'), ok));
    await assertFails(
      setDoc(doc(customerDb(), 'orders/o2'), {
        ...ok,
        discount: 90_000,
        total: 10_000,
        depositAmount: 5_000,
        paidAmount: 5_000,
      }),
    );
  });

  it('caps a fixed discount at the subtotal', async () => {
    await seed('promoCodes/KATTA', promo({ type: 'fixed', value: 500_000 }));
    await assertSucceeds(
      setDoc(
        doc(customerDb(), 'orders/o1'),
        orderData({
          promoCode: 'KATTA',
          discount: 100_000,
          total: 0,
          depositAmount: 0,
          paidAmount: 0,
        }),
      ),
    );
  });

  it('rejects inactive, expired, below-minimum and unknown codes', async () => {
    await seed('promoCodes/OFF', promo({ active: false }));
    await seed('promoCodes/OLD', promo({ expiresAt: 1_000 }));
    await seed('promoCodes/BIG', promo({ minSubtotal: 200_000 }));
    const withCode = (code: string) =>
      orderData({
        promoCode: code,
        discount: 10_000,
        total: 90_000,
        depositAmount: 45_000,
        paidAmount: 45_000,
      });
    for (const code of ['OFF', 'OLD', 'BIG', 'NOPE']) {
      await assertFails(setDoc(doc(customerDb(), `orders/${code}`), withCode(code)));
    }
  });

  it('rejects a discount without a code', async () => {
    await assertFails(
      setDoc(
        doc(customerDb(), 'orders/o1'),
        orderData({ discount: 10_000, total: 90_000, depositAmount: 45_000, paidAmount: 45_000 }),
      ),
    );
  });

  it('lets a customer get a code by id but never list them', async () => {
    await seed('promoCodes/BOLA10', promo());
    await assertSucceeds(getDoc(doc(anonDb(), 'promoCodes/BOLA10')));
    await assertFails(getDocs(collection(customerDb(), 'promoCodes')));
    await assertSucceeds(getDocs(collection(adminDb(), 'promoCodes')));
    await assertFails(setDoc(doc(customerDb(), 'promoCodes/FREE'), promo({ value: 90 })));
  });
});

describe('orders — delivery fee and totals', () => {
  const settings = { defaultFee: 40_000, regions: { 'tashkent-city': 20_000 }, freeFrom: 300_000 };
  const inRegion = (region: string, fee: number, over: Record<string, unknown> = {}) =>
    orderData({
      shippingAddress: { ...address, region },
      deliveryFee: fee,
      total: 100_000 + fee,
      depositAmount: Math.round((100_000 + fee) * 0.5),
      paidAmount: Math.round((100_000 + fee) * 0.5),
      ...over,
    });

  it('charges the region fee, else the default', async () => {
    await seed('settings/delivery', settings);
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o1'), inRegion('tashkent-city', 20_000)));
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o2'), inRegion('fergana', 40_000)));
    await assertFails(setDoc(doc(customerDb(), 'orders/o3'), inRegion('fergana', 0)));
  });

  it('is free from the threshold', async () => {
    await seed('settings/delivery', { ...settings, freeFrom: 100_000 });
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o1'), inRegion('fergana', 0)));
  });

  it('must be zero while delivery is not configured', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o1'), orderData()));
    await assertFails(setDoc(doc(customerDb(), 'orders/o2'), inRegion('fergana', 40_000)));
  });

  it('rejects an order below the minimum, measured after the discount', async () => {
    await seed('settings/delivery', { ...settings, minOrder: 150_000 });
    await assertFails(setDoc(doc(customerDb(), 'orders/o1'), inRegion('fergana', 40_000)));
    await seed('settings/delivery', { ...settings, minOrder: 100_000 });
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o2'), inRegion('fergana', 40_000)));
  });

  it('has no minimum while minOrder is absent', async () => {
    await seed('settings/delivery', settings);
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/o1'), inRegion('fergana', 40_000)));
  });

  it('rejects a total or deposit that does not add up', async () => {
    await assertFails(setDoc(doc(customerDb(), 'orders/o1'), orderData({ total: 1 })));
    await assertFails(
      setDoc(doc(customerDb(), 'orders/o2'), orderData({ depositAmount: 1, paidAmount: 1 })),
    );
  });

  it('settings are public to read and admin-only to write', async () => {
    await seed('settings/delivery', settings);
    await assertSucceeds(getDoc(doc(anonDb(), 'settings/delivery')));
    await assertFails(
      setDoc(doc(customerDb(), 'settings/delivery'), { ...settings, defaultFee: 0 }),
    );
    await assertSucceeds(setDoc(doc(adminDb(), 'settings/delivery'), settings));
  });
});

describe('contact messages', () => {
  const msg = (over: Record<string, unknown> = {}) => ({
    name: 'Ali',
    phone: '+998901234567',
    message: 'Salom, savolim bor',
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });

  it('anyone can send a well-formed message', async () => {
    await assertSucceeds(setDoc(doc(anonDb(), 'messages/m1'), msg()));
    await assertSucceeds(setDoc(doc(customerDb(), 'messages/m2'), msg({ userId: CUSTOMER })));
  });

  it('rejects oversized, extra-field, pre-read, back-dated and spoofed messages', async () => {
    await assertFails(setDoc(doc(anonDb(), 'messages/a'), msg({ message: 'x'.repeat(2001) })));
    await assertFails(setDoc(doc(anonDb(), 'messages/b'), msg({ link: 'http://spam' })));
    await assertFails(setDoc(doc(anonDb(), 'messages/c'), msg({ status: 'read' })));
    await assertFails(setDoc(doc(anonDb(), 'messages/d'), msg({ createdAt: 1 })));
    await assertFails(setDoc(doc(customerDb(), 'messages/e'), msg({ userId: OTHER })));
  });

  it('only admins read them and may only change the status', async () => {
    await assertSucceeds(setDoc(doc(anonDb(), 'messages/m1'), msg()));
    await assertFails(getDoc(doc(customerDb(), 'messages/m1')));
    await assertSucceeds(getDoc(doc(adminDb(), 'messages/m1')));
    await assertSucceeds(updateDoc(doc(adminDb(), 'messages/m1'), { status: 'read' }));
    await assertFails(updateDoc(doc(adminDb(), 'messages/m1'), { message: 'tahrir' }));
    await assertSucceeds(deleteDoc(doc(adminDb(), 'messages/m1')));
  });
});

describe('blog', () => {
  it('serves published posts to everyone and drafts only to admins', async () => {
    await seed('blogPosts/pub', { slug: 'a', published: true, publishedAt: 2 });
    await seed('blogPosts/draft', { slug: 'b', published: false });
    await assertSucceeds(getDoc(doc(anonDb(), 'blogPosts/pub')));
    await assertFails(getDoc(doc(anonDb(), 'blogPosts/draft')));
    await assertSucceeds(getDoc(doc(adminDb(), 'blogPosts/draft')));
    await assertSucceeds(
      getDocs(query(collection(anonDb(), 'blogPosts'), where('published', '==', true))),
    );
    await assertFails(getDocs(collection(anonDb(), 'blogPosts')));
  });

  it('only admins write', async () => {
    await assertFails(setDoc(doc(customerDb(), 'blogPosts/x'), { slug: 'x', published: true }));
    await assertSucceeds(setDoc(doc(adminDb(), 'blogPosts/x'), { slug: 'x', published: false }));
  });
});

describe('faqs', () => {
  it('are readable by anonymous visitors, single and list', async () => {
    await seed('faqs/f1', { question: { uz: 'q' }, answer: { uz: 'a' }, order: 0 });
    await assertSucceeds(getDoc(doc(anonDb(), 'faqs/f1')));
    await assertSucceeds(getDocs(collection(anonDb(), 'faqs')));
  });

  it('cannot be written by customers or anonymous visitors', async () => {
    await seed('faqs/f1', { question: { uz: 'q' }, answer: { uz: 'a' }, order: 0 });
    const data = { question: { uz: 'q' }, answer: { uz: 'a' }, order: 1 };
    await assertFails(setDoc(doc(customerDb(), 'faqs/x'), data));
    await assertFails(setDoc(doc(anonDb(), 'faqs/x'), data));
    await assertFails(updateDoc(doc(customerDb(), 'faqs/f1'), { order: 5 }));
    await assertFails(deleteDoc(doc(customerDb(), 'faqs/f1')));
  });

  it('can be created, edited and deleted by an admin', async () => {
    const data = { question: { uz: 'q' }, answer: { uz: 'a' }, order: 1 };
    await assertSucceeds(setDoc(doc(adminDb(), 'faqs/x'), data));
    await assertSucceeds(updateDoc(doc(adminDb(), 'faqs/x'), { order: 2 }));
    await assertSucceeds(deleteDoc(doc(adminDb(), 'faqs/x')));
  });
});

describe('favorites', () => {
  const fav = (productId: string) => ({ productId, createdAt: serverTimestamp() });

  it('are private to their owner', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), `users/${CUSTOMER}/favorites/p1`), fav('p1')));
    await assertSucceeds(getDoc(doc(customerDb(), `users/${CUSTOMER}/favorites/p1`)));
    await assertFails(getDoc(doc(otherDb(), `users/${CUSTOMER}/favorites/p1`)));
    await assertFails(setDoc(doc(otherDb(), `users/${CUSTOMER}/favorites/p2`), fav('p2')));
    await assertSucceeds(deleteDoc(doc(customerDb(), `users/${CUSTOMER}/favorites/p1`)));
  });

  it('keep the doc id equal to the product id and carry no extra data', async () => {
    await assertFails(setDoc(doc(customerDb(), `users/${CUSTOMER}/favorites/p1`), fav('p9')));
    await assertFails(
      setDoc(doc(customerDb(), `users/${CUSTOMER}/favorites/p1`), { ...fav('p1'), note: 'x' }),
    );
  });
});

// Faza 4 (2026-10-22): card transfer + receipts.
// ---------------------------------------------------------------------------

describe('card transfer — orders and receipts', () => {
  const jpeg = `data:image/jpeg;base64,${'A'.repeat(400_000)}`;
  const paymentSettings = {
    transferEnabled: true,
    cardNumber: '8600000000000000',
    cardHolder: 'KIDSWEAR TEST',
    bank: 'Test',
    note: '',
  };
  const transferOrder = (over: Record<string, unknown> = {}): Record<string, unknown> =>
    orderData({
      status: 'pending',
      paidAmount: 0,
      payment: { provider: 'transfer', state: 'created' },
      ...over,
    });
  // The exact shape `uploadReceipt` writes.
  const receipt = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    orderId: 't1',
    userId: CUSTOMER,
    data: jpeg,
    status: 'pending',
    createdAt: serverTimestamp(),
    ...over,
  });

  beforeEach(async () => {
    await seed('settings/payment', paymentSettings);
    await seed('orders/t1', transferOrder());
  });

  it('a customer creates a pending transfer order while transfers are on', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), 'orders/new'), transferOrder()));
  });

  it('a customer cannot create a transfer order already paid', async () => {
    await assertFails(
      setDoc(
        doc(customerDb(), 'orders/x'),
        transferOrder({ status: 'deposit_paid', paidAmount: 50_000 }),
      ),
    );
    await assertFails(setDoc(doc(customerDb(), 'orders/y'), transferOrder({ paidAmount: 50_000 })));
  });

  it('refuses transfer orders while switched off or not configured', async () => {
    await seed('settings/payment', { ...paymentSettings, transferEnabled: false });
    await assertFails(setDoc(doc(customerDb(), 'orders/off'), transferOrder()));
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'settings/payment'));
    });
    await assertFails(setDoc(doc(customerDb(), 'orders/none'), transferOrder()));
  });

  it('a customer cannot mark their own transfer order deposit_paid', async () => {
    await assertFails(
      updateDoc(doc(customerDb(), 'orders/t1'), { status: 'deposit_paid', paidAmount: 50_000 }),
    );
  });

  it('settings/payment is public read, admin write', async () => {
    await assertSucceeds(getDoc(doc(anonDb(), 'settings/payment')));
    await assertFails(setDoc(doc(customerDb(), 'settings/payment'), paymentSettings));
    await assertSucceeds(setDoc(doc(adminDb(), 'settings/payment'), paymentSettings));
  });

  it('the owner uploads a receipt; owner and admin read it, nobody else', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), 'receipts/t1_r1'), receipt()));
    await assertSucceeds(getDoc(doc(customerDb(), 'receipts/t1_r1')));
    await assertSucceeds(
      getDocs(
        query(
          collection(customerDb(), 'receipts'),
          where('orderId', '==', 't1'),
          where('userId', '==', CUSTOMER),
        ),
      ),
    );
    await assertSucceeds(getDoc(doc(adminDb(), 'receipts/t1_r1')));
    await assertSucceeds(
      getDocs(query(collection(adminDb(), 'receipts'), where('orderId', '==', 't1'))),
    );
    await assertFails(getDoc(doc(otherDb(), 'receipts/t1_r1')));
    await assertFails(getDoc(doc(anonDb(), 'receipts/t1_r1')));
    // A query not limited to the caller's own receipts is refused outright.
    await assertFails(
      getDocs(query(collection(otherDb(), 'receipts'), where('orderId', '==', 't1'))),
    );
  });

  it("another user cannot attach a receipt to someone else's order", async () => {
    await assertFails(setDoc(doc(otherDb(), 'receipts/t1_r1'), receipt({ userId: OTHER })));
    await assertFails(setDoc(doc(otherDb(), 'receipts/t1_r2'), receipt()));
  });

  it('refuses receipts for non-transfer or non-pending orders', async () => {
    await seed('orders/m1', orderData());
    await assertFails(setDoc(doc(customerDb(), 'receipts/m1_r1'), receipt({ orderId: 'm1' })));
    await seed('orders/t2', transferOrder({ status: 'cancelled' }));
    await assertFails(setDoc(doc(customerDb(), 'receipts/t2_r1'), receipt({ orderId: 't2' })));
    await assertFails(setDoc(doc(customerDb(), 'receipts/zz_r1'), receipt({ orderId: 'zz' })));
  });

  it('caps an order at five receipts: a sixth slot is refused', async () => {
    for (let n = 1; n <= 5; n += 1) {
      await assertSucceeds(setDoc(doc(customerDb(), `receipts/t1_r${n}`), receipt()));
    }
    await assertFails(setDoc(doc(customerDb(), 'receipts/t1_r6'), receipt()));
    await assertFails(setDoc(doc(customerDb(), 'receipts/t1_other'), receipt()));
    // A taken slot cannot be overwritten either.
    await assertFails(setDoc(doc(customerDb(), 'receipts/t1_r1'), receipt()));
  });

  it('rejects malformed receipts', async () => {
    const db = customerDb();
    await assertFails(setDoc(doc(db, 'receipts/t1_r1'), receipt({ status: 'approved' })));
    await assertFails(setDoc(doc(db, 'receipts/t1_r1'), receipt({ createdAt: 1 })));
    await assertFails(setDoc(doc(db, 'receipts/t1_r1'), receipt({ extra: true })));
    await assertFails(
      setDoc(doc(db, 'receipts/t1_r1'), receipt({ data: 'data:image/png;base64,AAAA' })),
    );
    await assertFails(
      setDoc(
        doc(db, 'receipts/t1_r1'),
        receipt({ data: `data:image/jpeg;base64,${'A'.repeat(420_000)}` }),
      ),
    );
    await assertFails(setDoc(doc(db, 'receipts/t1_r1'), receipt({ reviewedBy: CUSTOMER })));
  });

  it('a customer can neither approve, edit nor delete a receipt', async () => {
    await seed('receipts/t1_r1', { ...receipt(), createdAt: 1 });
    await assertFails(updateDoc(doc(customerDb(), 'receipts/t1_r1'), { status: 'approved' }));
    await assertFails(updateDoc(doc(customerDb(), 'receipts/t1_r1'), { data: jpeg }));
    await assertFails(deleteDoc(doc(customerDb(), 'receipts/t1_r1')));
  });

  it('an admin only changes the review fields, once', async () => {
    await seed('receipts/t1_r1', { ...receipt(), createdAt: 1 });
    const db = adminDb();
    await assertFails(
      updateDoc(doc(db, 'receipts/t1_r1'), {
        status: 'rejected',
        reviewedBy: ADMIN,
        reviewedAt: serverTimestamp(),
        data: jpeg.slice(0, 100),
      }),
    );
    await assertFails(
      updateDoc(doc(db, 'receipts/t1_r1'), {
        status: 'rejected',
        reviewedBy: CUSTOMER,
        reviewedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'receipts/t1_r1'), {
        status: 'rejected',
        reviewedBy: ADMIN,
        reviewedAt: serverTimestamp(),
        note: 'Summa mos emas',
      }),
    );
    await assertFails(
      updateDoc(doc(db, 'receipts/t1_r1'), {
        status: 'approved',
        reviewedBy: ADMIN,
        reviewedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(doc(db, 'receipts/t1_r1')));
    // After a rejection the customer uploads a new receipt in the next slot.
    await assertSucceeds(setDoc(doc(customerDb(), 'receipts/t1_r2'), receipt()));
  });

  it("passes the admin's approval transaction: receipt approved, order deposit_paid", async () => {
    await seed('receipts/t1_r1', { ...receipt(), createdAt: 1 });
    const db = adminDb();
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        const r = await tx.get(doc(db, 'receipts/t1_r1'));
        const o = await tx.get(doc(db, 'orders/t1'));
        if (r.get('status') !== 'pending' || o.get('status') !== 'pending') return;
        tx.update(doc(db, 'receipts/t1_r1'), {
          status: 'approved',
          reviewedBy: ADMIN,
          reviewedAt: serverTimestamp(),
        });
        tx.update(doc(db, 'orders/t1'), {
          status: 'deposit_paid',
          paidAmount: o.get('depositAmount'),
          'payment.state': 'paid',
          'payment.paidAt': Date.now(),
          'payment.transactionId': 't1_r1',
          updatedAt: serverTimestamp(),
        });
      }),
    );
    let status: unknown;
    let paid: unknown;
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const o = await getDoc(doc(ctx.firestore(), 'orders/t1'));
      status = o.get('status');
      paid = o.get('paidAmount');
    });
    if (status !== 'deposit_paid' || paid !== 50_000) {
      throw new Error(`expected deposit_paid/50000, got ${String(status)}/${String(paid)}`);
    }
    // The order is no longer pending: no more receipts.
    await assertFails(setDoc(doc(customerDb(), 'receipts/t1_r2'), receipt()));
  });
});

describe('reviews', () => {
  const delivered = (over: Record<string, unknown> = {}): Record<string, unknown> =>
    orderData({
      status: 'delivered',
      items: [
        { productId: 'p1', quantity: 1, price: 50_000 },
        { productId: 'p2', quantity: 1, price: 50_000 },
      ],
      ...over,
    });
  // The exact shape `submitReview` writes.
  const review = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    productId: 'p2',
    userId: CUSTOMER,
    orderId: 'd1',
    authorName: 'Ali V.',
    rating: 5,
    text: 'Zo‘r sifat',
    status: 'visible',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });
  const stored = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...review(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...over,
  });

  beforeEach(async () => {
    await seed('orders/d1', delivered());
    await seed('products/p1', { rating: 0, reviewCount: 0 });
    await seed('products/p2', { rating: 0, reviewCount: 0 });
  });

  it('the buyer reviews a product of their delivered order', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), 'reviews/d1_p2'), review()));
  });

  it('finds the product on any of the first 20 order lines', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ productId: `q${i}`, quantity: 1 }));
    await seed('orders/long', delivered({ items }));
    await assertSucceeds(
      setDoc(doc(customerDb(), 'reviews/long_q19'), review({ orderId: 'long', productId: 'q19' })),
    );
  });

  it('someone who did not buy the product cannot review it', async () => {
    await assertFails(setDoc(doc(customerDb(), 'reviews/d1_p9'), review({ productId: 'p9' })));
    // No order at all.
    await assertFails(
      setDoc(doc(customerDb(), 'reviews/none_p1'), review({ orderId: 'none', productId: 'p1' })),
    );
    await assertFails(setDoc(doc(anonDb(), 'reviews/d1_p2'), review()));
  });

  it('an order that is not delivered yet does not qualify', async () => {
    for (const status of ['pending', 'deposit_paid', 'processing', 'shipped', 'cancelled']) {
      await seed('orders/d1', delivered({ status }));
      await assertFails(setDoc(doc(customerDb(), 'reviews/d1_p2'), review()));
    }
  });

  it("another customer's order does not qualify", async () => {
    await assertFails(setDoc(doc(otherDb(), 'reviews/d1_p2'), review({ userId: OTHER })));
    // Nor writing in the buyer's name.
    await assertFails(setDoc(doc(otherDb(), 'reviews/d1_p2'), review()));
  });

  it('the id must be {orderId}_{productId}', async () => {
    await assertFails(setDoc(doc(customerDb(), 'reviews/whatever'), review()));
    await assertFails(setDoc(doc(customerDb(), 'reviews/d1_p1'), review()));
  });

  it('a second review of the same order line is refused', async () => {
    await assertSucceeds(setDoc(doc(customerDb(), 'reviews/d1_p2'), review()));
    await assertFails(setDoc(doc(customerDb(), 'reviews/d1_p2'), review({ rating: 1 })));
  });

  it('a customer cannot create it hidden, featured or with a bad shape', async () => {
    const db = customerDb();
    await assertFails(setDoc(doc(db, 'reviews/d1_p2'), review({ status: 'hidden' })));
    await assertFails(setDoc(doc(db, 'reviews/d1_p2'), review({ featured: true })));
    await assertFails(setDoc(doc(db, 'reviews/d1_p2'), review({ rating: 6 })));
    await assertFails(setDoc(doc(db, 'reviews/d1_p2'), review({ rating: 4.5 })));
    await assertFails(setDoc(doc(db, 'reviews/d1_p2'), review({ text: 'a'.repeat(1001) })));
    await assertFails(setDoc(doc(db, 'reviews/d1_p2'), review({ authorName: '' })));
  });

  it('a customer cannot feature, hide or delete a review, even their own', async () => {
    await seed('reviews/d1_p2', stored());
    const ref = doc(customerDb(), 'reviews/d1_p2');
    await assertFails(updateDoc(ref, { featured: true }));
    await assertFails(updateDoc(ref, { status: 'hidden' }));
    await assertFails(deleteDoc(ref));
    await assertFails(updateDoc(doc(otherDb(), 'reviews/d1_p2'), { featured: true }));
  });

  it('a customer cannot write product ratings', async () => {
    await assertFails(updateDoc(doc(customerDb(), 'products/p2'), { rating: 5, reviewCount: 1 }));
  });

  it('the author edits stars and text within 7 days only', async () => {
    await seed('reviews/d1_p2', stored());
    const ref = doc(customerDb(), 'reviews/d1_p2');
    await assertSucceeds(
      updateDoc(ref, { rating: 3, text: 'Yaxshi', updatedAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(ref, { authorName: 'X', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(otherDb(), 'reviews/d1_p2'), { rating: 1 }));

    const eightDaysAgo = Timestamp.fromMillis(Date.now() - 8 * 86_400_000);
    await seed('reviews/d1_p2', stored({ createdAt: eightDaysAgo, updatedAt: eightDaysAgo }));
    await assertFails(updateDoc(ref, { rating: 1, updatedAt: serverTimestamp() }));
  });

  it('visible reviews are public; hidden ones only for the author and admins', async () => {
    await seed('reviews/d1_p2', stored());
    await seed('reviews/d1_p1', stored({ productId: 'p1', status: 'hidden' }));

    await assertSucceeds(getDoc(doc(anonDb(), 'reviews/d1_p2')));
    await assertSucceeds(
      getDocs(
        query(
          collection(anonDb(), 'reviews'),
          where('productId', '==', 'p2'),
          where('status', '==', 'visible'),
        ),
      ),
    );
    await assertFails(getDoc(doc(anonDb(), 'reviews/d1_p1')));
    await assertFails(getDoc(doc(otherDb(), 'reviews/d1_p1')));
    // An unfiltered list could include hidden reviews.
    await assertFails(
      getDocs(query(collection(otherDb(), 'reviews'), where('productId', '==', 'p1'))),
    );

    await assertSucceeds(getDoc(doc(customerDb(), 'reviews/d1_p1')));
    await assertSucceeds(
      getDocs(
        query(
          collection(customerDb(), 'reviews'),
          where('orderId', '==', 'd1'),
          where('userId', '==', CUSTOMER),
        ),
      ),
    );
    await assertSucceeds(getDoc(doc(adminDb(), 'reviews/d1_p1')));
  });

  it('admin moderation: status/featured with the product recount, and delete', async () => {
    await seed('reviews/d1_p2', stored());
    const db = adminDb();
    // The `moderateReview` transaction: review flags + product aggregate together.
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        await tx.get(doc(db, 'reviews/d1_p2'));
        tx.update(doc(db, 'reviews/d1_p2'), {
          status: 'hidden',
          featured: true,
          updatedAt: serverTimestamp(),
        });
        tx.update(doc(db, 'products/p2'), { rating: 0, reviewCount: 0 });
      }),
    );
    // Admins moderate; they do not rewrite what the customer said.
    await assertFails(updateDoc(doc(db, 'reviews/d1_p2'), { text: 'edited' }));
    await assertFails(updateDoc(doc(db, 'reviews/d1_p2'), { status: 'deleted' }));
    await assertSucceeds(deleteDoc(doc(db, 'reviews/d1_p2')));
  });
});

describe('purchase costs — productCosts & orderCosts (Faza 7)', () => {
  const productCost = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    cost: 60_000,
    variants: { 'M|red': 55_000 },
    updatedBy: ADMIN,
    updatedAt: serverTimestamp(),
    ...over,
  });
  const orderCost = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    lines: [
      {
        productId: 'p1',
        variantId: 'default',
        quantity: 1,
        price: 100_000,
        unitCost: 60_000,
      },
    ],
    totalCost: 60_000,
    missingLines: 0,
    by: ADMIN,
    createdAt: serverTimestamp(),
    ...over,
  });

  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'products/p1'), { stock: 5, price: 100_000 });
      await setDoc(doc(db, 'orders/o1'), orderData());
      await setDoc(doc(db, 'orders/o2'), orderData());
      await setDoc(doc(db, 'productCosts/p1'), { ...productCost(), updatedAt: 1 });
      await setDoc(doc(db, 'orderCosts/o1'), { ...orderCost(), createdAt: 1 });
    });
  });

  const outsiders = [
    ['anonymous', anonDb],
    ['the customer who owns the order', customerDb],
    ['another user', otherDb],
  ] as const;

  for (const [who, db] of outsiders) {
    it(`${who} cannot read them by get, list, query or collection group`, async () => {
      for (const name of ['productCosts', 'orderCosts']) {
        const id = name === 'productCosts' ? 'p1' : 'o1';
        await assertFails(getDoc(doc(db(), `${name}/${id}`)));
        await assertFails(getDocs(collection(db(), name)));
        await assertFails(getDocs(query(collection(db(), name), where('by', '==', ADMIN))));
        await assertFails(getDocs(collectionGroup(db(), name)));
      }
      // Missing documents are not probeable either.
      await assertFails(getDoc(doc(db(), 'productCosts/none')));
      await assertFails(getDoc(doc(db(), 'orderCosts/o2')));
    });

    it(`${who} cannot create, change or delete them`, async () => {
      const uid = db === anonDb ? ADMIN : db === otherDb ? OTHER : CUSTOMER;
      await assertFails(setDoc(doc(db(), 'productCosts/p2'), productCost({ updatedBy: uid })));
      await assertFails(updateDoc(doc(db(), 'productCosts/p1'), { cost: 1 }));
      await assertFails(deleteDoc(doc(db(), 'productCosts/p1')));
      await assertFails(setDoc(doc(db(), 'orderCosts/o2'), orderCost({ by: uid })));
      await assertFails(updateDoc(doc(db(), 'orderCosts/o1'), { totalCost: 0 }));
      await assertFails(deleteDoc(doc(db(), 'orderCosts/o1')));
    });
  }

  it('the public product document stays readable and is not where cost lives', async () => {
    await assertSucceeds(getDoc(doc(anonDb(), 'products/p1')));
    await assertFails(getDoc(doc(anonDb(), 'productCosts/p1')));
  });

  it('an admin reads both collections and writes product costs', async () => {
    const db = adminDb();
    await assertSucceeds(getDoc(doc(db, 'productCosts/p1')));
    await assertSucceeds(getDocs(collection(db, 'productCosts')));
    await assertSucceeds(getDoc(doc(db, 'orderCosts/o1')));
    await assertSucceeds(getDocs(collection(db, 'orderCosts')));
    await assertSucceeds(setDoc(doc(db, 'productCosts/p2'), productCost()));
    const { cost: _none, ...variantsOnly } = productCost();
    await assertSucceeds(setDoc(doc(db, 'productCosts/p3'), variantsOnly));
    await assertSucceeds(setDoc(doc(db, 'productCosts/p1'), productCost({ cost: 0 })));
    await assertSucceeds(deleteDoc(doc(db, 'productCosts/p1')));
  });

  it('rejects malformed product costs, even from an admin', async () => {
    const db = adminDb();
    await assertFails(setDoc(doc(db, 'productCosts/a'), productCost({ cost: -1 })));
    await assertFails(setDoc(doc(db, 'productCosts/b'), productCost({ cost: 1.5 })));
    await assertFails(setDoc(doc(db, 'productCosts/c'), productCost({ variants: [] })));
    await assertFails(setDoc(doc(db, 'productCosts/d'), productCost({ updatedBy: CUSTOMER })));
    await assertFails(setDoc(doc(db, 'productCosts/e'), productCost({ updatedAt: 1 })));
    await assertFails(setDoc(doc(db, 'productCosts/f'), productCost({ price: 1 })));
  });

  it('passes the confirm transaction: stock, flag and cost snapshot together, once', async () => {
    const db = adminDb();
    const confirm = (): Promise<void> =>
      runTransaction(db, async (tx) => {
        const order = await tx.get(doc(db, 'orders/o2'));
        await tx.get(doc(db, 'products/p1'));
        const snapshot = await tx.get(doc(db, 'orderCosts/o2'));
        await tx.get(doc(db, 'productCosts/p1'));
        if (order.get('stockApplied') !== true) {
          tx.update(doc(db, 'products/p1'), { stock: 4 });
        }
        if (!snapshot.exists()) tx.set(doc(db, 'orderCosts/o2'), orderCost());
        tx.update(doc(db, 'orders/o2'), { status: 'processing', stockApplied: true });
      });
    await assertSucceeds(confirm());
    // Re-running finds the snapshot and writes none — the flow is idempotent.
    await assertSucceeds(confirm());
    // The snapshot is immutable: no overwrite, edit or delete.
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ totalCost: 1 })));
    await assertFails(updateDoc(doc(db, 'orderCosts/o2'), { totalCost: 1 }));
    await assertFails(deleteDoc(doc(db, 'orderCosts/o2')));
  });

  it('rejects malformed or orphan snapshots, even from an admin', async () => {
    const db = adminDb();
    await assertFails(setDoc(doc(db, 'orderCosts/missing'), orderCost()));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ totalCost: -1 })));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ missingLines: 0.5 })));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ lines: 'x' })));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ by: CUSTOMER })));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ createdAt: 1 })));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ backfilled: false })));
    await assertFails(setDoc(doc(db, 'orderCosts/o2'), orderCost({ profit: 1 })));
    await assertSucceeds(setDoc(doc(db, 'orderCosts/o2'), orderCost({ backfilled: true })));
  });
});
