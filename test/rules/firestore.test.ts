import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

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
        orderData({ status: 'pending', paidAmount: 0, payment: { provider: 'payme', state: 'created' } }),
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
      await setDoc(doc(ctx.firestore(), 'orders/o1'), orderData());
    });
  });

  it('lets the owner cancel a deposit_paid order', async () => {
    await assertSucceeds(updateDoc(doc(customerDb(), 'orders/o1'), { status: 'cancelled' }));
  });

  it('stops the owner from changing status to anything but cancelled', async () => {
    await assertFails(updateDoc(doc(customerDb(), 'orders/o1'), { status: 'shipped' }));
    await assertFails(updateDoc(doc(customerDb(), 'orders/o1'), { status: 'delivered' }));
  });

  it('stops the owner from editing money while cancelling', async () => {
    // Status-only change: smuggling a refund past the rules must fail.
    await assertFails(
      updateDoc(doc(customerDb(), 'orders/o1'), { status: 'cancelled', paidAmount: 0 }),
    );
  });

  it('stops a different customer from cancelling', async () => {
    await assertFails(updateDoc(doc(otherDb(), 'orders/o1'), { status: 'cancelled' }));
  });

  it('lets an admin move the order through fulfilment', async () => {
    await assertSucceeds(updateDoc(doc(adminDb(), 'orders/o1'), { status: 'shipped' }));
  });

  it('stops the owner from cancelling once it has shipped', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'orders/o2'), orderData({ status: 'shipped' }));
    });
    await assertFails(updateDoc(doc(customerDb(), 'orders/o2'), { status: 'cancelled' }));
  });

  it('never allows deletion, even by an admin', async () => {
    await assertFails(deleteDoc(doc(customerDb(), 'orders/o1')));
    await assertFails(deleteDoc(doc(adminDb(), 'orders/o1')));
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
