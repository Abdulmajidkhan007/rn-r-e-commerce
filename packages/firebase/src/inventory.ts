import {
  type DocumentReference,
  type Transaction,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  StockMoveSchema,
  manualStockDelta,
  applyVariantDeltas,
  orderLinesStockChange,
  stockActionFor,
  STOCK_HOLDING_STATUSES,
  type OrderItem,
  type OrderStatus,
  type Product,
  type StockAction,
  type StockChange,
  type StockMove,
} from '@kidswear/core';
import { getDb } from './app';
import { COLLECTIONS, orderDoc, productDoc } from './collections';
import { createConverter } from './converters';
import { prepareOrderCostSnapshot } from './costs';

export type InventoryErrorCode =
  | 'orderNotFound'
  | 'productNotFound'
  | 'insufficient'
  | 'missingVariant'
  | 'invalidQuantity';

/**
 * A stock operation that was refused. The transaction wrote nothing; `message`
 * is an i18n key, `productId`/`variantId` say which line to show the admin.
 */
export class InventoryError extends Error {
  readonly code: InventoryErrorCode;
  readonly productId: string | undefined;
  readonly variantId: string | undefined;

  constructor(code: InventoryErrorCode, productId?: string, variantId?: string) {
    super(`inventory.errors.${code}`);
    this.name = 'InventoryError';
    this.code = code;
    this.productId = productId;
    this.variantId = variantId;
  }
}

const stockMoveConverter = createConverter(StockMoveSchema);

function stockMovesCol() {
  return collection(getDb(), COLLECTIONS.stockMoves);
}

/** Journal rows go through the raw collection: the converter stamps `updatedAt`, which the rules forbid. */
function writeMove(tx: Transaction, move: Omit<StockMove, 'id' | 'createdAt'>): void {
  const { orderId, note, ...rest } = move;
  tx.set(doc(stockMovesCol()), {
    ...rest,
    ...(orderId ? { orderId } : {}),
    ...(note ? { note } : {}),
    createdAt: serverTimestamp(),
  });
}

function unwrap(change: StockChange, productId: string): Extract<StockChange, { ok: true }> {
  if (!change.ok) throw new InventoryError(change.error, productId, change.variantId);
  return change;
}

function writeProductStock(
  tx: Transaction,
  ref: DocumentReference<Product>,
  change: Extract<StockChange, { ok: true }>,
): void {
  tx.update(ref, { ...change.patch, updatedAt: serverTimestamp() });
}

interface LoadedProduct {
  productId: string;
  ref: DocumentReference<Product>;
  product: Product | null;
}

export interface StatusChangeResult {
  action: StockAction;
}

/**
 * Admin: moves an order to `next`, taking or returning its stock in the same
 * transaction (see `stockActionFor`). `stockApplied` is read inside the
 * transaction, so a double click — or the Blaze `onOrderCreate` trigger having
 * already taken the stock — never decrements twice. On a shortfall the
 * transaction aborts with an `InventoryError` and the status stays as it was.
 */
export async function changeOrderStatus(
  orderId: string,
  next: OrderStatus,
  by: string,
): Promise<StatusChangeResult> {
  return runTransaction(getDb(), async (tx) => {
    const orderRef = orderDoc(orderId);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.exists() ? orderSnap.data() : null;
    if (!order) throw new InventoryError('orderNotFound');

    const action = stockActionFor(order.status, next, order.stockApplied === true);
    // A confirmed order gets its cost snapshot once (orderCosts, create-once),
    // also when its stock was already taken elsewhere (Blaze onOrderCreate).
    const confirming = STOCK_HOLDING_STATUSES.includes(next);
    if (action === 'none' && !confirming) {
      tx.update(orderRef, { status: next, updatedAt: serverTimestamp() });
      return { action };
    }

    // Variants of one product share its document: group lines per product.
    const linesByProduct = new Map<string, OrderItem[]>();
    for (const item of order.items) {
      linesByProduct.set(item.productId, [...(linesByProduct.get(item.productId) ?? []), item]);
    }

    // All reads before any write (Firestore transaction rule). Products are
    // read at most once, by whichever step needs them first.
    let loaded: Promise<LoadedProduct[]> | null = null;
    const loadProducts = (): Promise<LoadedProduct[]> =>
      (loaded ??= Promise.all(
        [...linesByProduct.keys()].map(async (productId) => {
          const ref = productDoc(productId);
          const snap = await tx.get(ref);
          return { productId, ref, product: snap.exists() ? snap.data() : null };
        }),
      ));

    const writes: {
      productId: string;
      ref: DocumentReference<Product>;
      change: Extract<StockChange, { ok: true }>;
    }[] = [];
    const direction = action === 'apply' ? 'sale' : 'return';
    if (action !== 'none') {
      for (const { productId, ref, product } of await loadProducts()) {
        if (!product) {
          // A deleted product cannot take its units back; a sale needs it.
          if (direction === 'return') continue;
          throw new InventoryError('productNotFound', productId);
        }
        const lines = linesByProduct.get(productId) ?? [];
        writes.push({
          productId,
          ref,
          change: unwrap(orderLinesStockChange(product, lines, direction), productId),
        });
      }
    }
    const writeCost = confirming
      ? await prepareOrderCostSnapshot(
          tx,
          order,
          async () => new Map((await loadProducts()).map((p) => [p.productId, p.product])),
          by,
        )
      : null;

    for (const { productId, ref, change } of writes) {
      writeProductStock(tx, ref, change);
      for (const { variantId, delta } of change.deltas) {
        writeMove(tx, { productId, variantId, delta, reason: direction, orderId, by });
      }
    }
    writeCost?.();
    tx.update(orderRef, {
      status: next,
      ...(action === 'none' ? {} : { stockApplied: action === 'apply' }),
      updatedAt: serverTimestamp(),
    });
    return { action };
  });
}

export interface StockAdjustment {
  productId: string;
  variantId: string;
  reason: 'intake' | 'writeoff' | 'inventory';
  /** Units received / written off, or the counted total for `inventory`. */
  quantity: number;
  note?: string;
  by: string;
}

/**
 * Admin: a manual warehouse move (kirim, hisobdan chiqarish, inventarizatsiya)
 * on one variant, journalled in the same transaction. Returns the applied
 * delta (0 when an inventory count matched — nothing is written then).
 */
export async function adjustStock(input: StockAdjustment): Promise<number> {
  const { productId, variantId, reason, quantity, note, by } = input;
  const positive = reason !== 'inventory';
  if (!Number.isInteger(quantity) || quantity < 0 || (positive && quantity === 0)) {
    throw new InventoryError('invalidQuantity', productId, variantId);
  }

  return runTransaction(getDb(), async (tx) => {
    const ref = productDoc(productId);
    const snap = await tx.get(ref);
    const product = snap.exists() ? snap.data() : null;
    if (!product) throw new InventoryError('productNotFound', productId);

    const delta = manualStockDelta(product, variantId, reason, quantity);
    if (delta === null) throw new InventoryError('missingVariant', productId, variantId);
    if (delta === 0) return 0;

    const change = unwrap(applyVariantDeltas(product, [{ variantId, delta }]), productId);
    writeProductStock(tx, ref, change);
    writeMove(tx, {
      productId,
      variantId,
      delta,
      reason,
      by,
      ...(note?.trim() ? { note: note.trim() } : {}),
    });
    return delta;
  });
}

/** Admin: the newest journal rows. */
export async function getStockMoves(max = 200): Promise<StockMove[]> {
  const snap = await getDocs(
    query(
      stockMovesCol().withConverter(stockMoveConverter),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((d) => d.data());
}

/**
 * Owner: cancels their own order while it is still `pending` — the rules
 * allow exactly this change and nothing else. A pending order never holds
 * stock, so there is nothing to return.
 */
export async function cancelOwnOrder(orderId: string): Promise<void> {
  await updateDoc(orderDoc(orderId), {
    status: 'cancelled',
    cancelReason: 'customer',
    updatedAt: serverTimestamp(),
  });
}
