import {
  type DocumentReference,
  type Transaction,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  OrderCostSchema,
  ProductCostSchema,
  buildOrderCostLines,
  resolveLineVariant,
  type Order,
  type OrderCost,
  type OrderItem,
  type Product,
  type ProductCost,
  type ProductCostInput,
} from '@kidswear/core';
import { getDb } from './app';
import { COLLECTIONS, orderDoc, productDoc } from './collections';
import { createConverter } from './converters';

// Admin-only collections (rules: no customer or anonymous access at all).
// Writes go through raw refs: the converter would stamp createdAt/updatedAt,
// which these documents' rules do not allow.
const productCostConverter = createConverter(ProductCostSchema);
const orderCostConverter = createConverter(OrderCostSchema);

export function productCostDoc(productId: string): DocumentReference {
  return doc(getDb(), COLLECTIONS.productCosts, productId);
}

export function orderCostDoc(orderId: string): DocumentReference {
  return doc(getDb(), COLLECTIONS.orderCosts, orderId);
}

/** Admin: every product's cost document. */
export async function getProductCosts(): Promise<ProductCost[]> {
  const snap = await getDocs(
    collection(getDb(), COLLECTIONS.productCosts).withConverter(productCostConverter),
  );
  return snap.docs.map((d) => d.data());
}

/** Admin: one product's cost, or `null` when none was entered. */
export async function getProductCost(productId: string): Promise<ProductCost | null> {
  const snap = await getDoc(productCostDoc(productId).withConverter(productCostConverter));
  return snap.exists() ? snap.data() : null;
}

/** Admin: replaces a product's cost document (see `normalizeProductCost`). */
export async function setProductCost(
  productId: string,
  input: ProductCostInput,
  by: string,
): Promise<void> {
  await setDoc(productCostDoc(productId), {
    ...(input.cost !== undefined ? { cost: input.cost } : {}),
    variants: input.variants,
    updatedBy: by,
    updatedAt: serverTimestamp(),
  });
}

/** Admin: every order cost snapshot. */
export async function getOrderCosts(): Promise<OrderCost[]> {
  const snap = await getDocs(
    collection(getDb(), COLLECTIONS.orderCosts).withConverter(orderCostConverter),
  );
  return snap.docs.map((d) => d.data());
}

/** Resolves a line's variant id against its product (legacy lines carry none). */
function variantIdResolver(
  products: ReadonlyMap<string, Product | null>,
): (item: OrderItem) => string | undefined {
  return (item) => {
    if (item.variantId) return item.variantId;
    const product = products.get(item.productId);
    return product ? resolveLineVariant(product, item)?.id : undefined;
  };
}

/**
 * Inside a transaction: reads the order's snapshot slot and, when empty, its
 * products (`loadProducts`, to resolve legacy lines) and the cost of each. Returns a writer to call after the
 * transaction's other reads (Firestore wants all reads before any write), or
 * `null` when a snapshot already exists — create-once makes it idempotent.
 */
export async function prepareOrderCostSnapshot(
  tx: Transaction,
  order: Pick<Order, 'id' | 'items'>,
  loadProducts: () => Promise<ReadonlyMap<string, Product | null>>,
  by: string,
  backfilled = false,
): Promise<(() => void) | null> {
  const ref = orderCostDoc(order.id);
  if ((await tx.get(ref)).exists()) return null;
  const products = await loadProducts();

  const productIds = [...new Set(order.items.map((i) => i.productId))];
  const costs = new Map<string, ProductCostInput | null>();
  for (const productId of productIds) {
    const snap = await tx.get(productCostDoc(productId).withConverter(productCostConverter));
    costs.set(productId, snap.exists() ? snap.data() : null);
  }
  const snapshot = buildOrderCostLines(order.items, costs, variantIdResolver(products));
  return () => {
    tx.set(ref, {
      ...snapshot,
      ...(backfilled ? { backfilled: true } : {}),
      by,
      createdAt: serverTimestamp(),
    });
  };
}

/**
 * Admin: writes a snapshot from today's costs for one confirmed order that has
 * none (confirmed before cost tracking existed). Marked `backfilled`. Returns
 * false when it already had one.
 */
export async function backfillOrderCost(orderId: string, by: string): Promise<boolean> {
  return runTransaction(getDb(), async (tx) => {
    const orderSnap = await tx.get(orderDoc(orderId));
    if (!orderSnap.exists()) return false;
    const order = orderSnap.data();
    const loadProducts = async (): Promise<Map<string, Product | null>> => {
      const products = new Map<string, Product | null>();
      for (const productId of new Set(order.items.map((i) => i.productId))) {
        const snap = await tx.get(productDoc(productId));
        products.set(productId, snap.exists() ? snap.data() : null);
      }
      return products;
    };
    const write = await prepareOrderCostSnapshot(tx, order, loadProducts, by, true);
    if (!write) return false;
    write();
    return true;
  });
}
