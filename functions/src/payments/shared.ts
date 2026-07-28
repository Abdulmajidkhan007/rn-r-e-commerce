import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin.js';
import type { Order } from '../types.js';

export type PaymentProvider = 'payme' | 'click';

/** Payme bills in tiyin; 1 som = 100 tiyin. Click bills in som. */
export const TIYIN_PER_SOM = 100;

export function somToTiyin(som: number): number {
  return Math.round(som * TIYIN_PER_SOM);
}

export interface OrderLookup {
  order: Order;
  exists: true;
}

/**
 * Loads an order for a gateway callback.
 *
 * Returns null rather than throwing: both gateways expect a specific error
 * *code* for an unknown account, not an exception, and an unhandled throw would
 * make them retry indefinitely.
 */
export async function loadOrder(orderId: string): Promise<Order | null> {
  if (!orderId) return null;
  const snap = await db().collection('orders').doc(orderId).get();
  if (!snap.exists) return null;
  return { ...(snap.data() as Order), id: snap.id };
}

/** An order is payable while it is still awaiting the deposit. */
export function isPayable(order: Order): boolean {
  return order.status === 'pending';
}

/** True once the deposit has already been recorded for this order. */
export function isAlreadyPaid(order: Order): boolean {
  return order.paidAmount >= order.depositAmount && order.status !== 'pending';
}

/**
 * Records a confirmed deposit.
 *
 * Idempotent by design: gateways retry, and a duplicate confirmation must not
 * double-count. Guarded inside a transaction so two concurrent callbacks cannot
 * both pass the check.
 */
export async function confirmDeposit(
  orderId: string,
  provider: PaymentProvider,
  transactionId: string,
  paidAt: number,
): Promise<'confirmed' | 'already-confirmed' | 'not-found' | 'not-payable'> {
  const ref = db().collection('orders').doc(orderId);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'not-found';

    const order = snap.data() as Order;
    if (isAlreadyPaid(order)) return 'already-confirmed';
    if (!isPayable(order)) return 'not-payable';

    tx.update(ref, {
      status: 'deposit_paid',
      paidAmount: order.depositAmount,
      payment: {
        provider,
        state: 'paid',
        transactionId,
        paidAt,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    return 'confirmed';
  });
}

/**
 * Records a gateway-side cancellation. The order goes back to a terminal
 * cancelled state; stock was never decremented because that only happens once
 * an order reaches deposit_paid.
 */
export async function cancelPayment(
  orderId: string,
  provider: PaymentProvider,
  transactionId: string,
  reason: number,
  cancelledAt: number,
): Promise<void> {
  const ref = db().collection('orders').doc(orderId);
  try {
    await ref.update({
      status: 'cancelled',
      cancelReason: 'payment_cancelled',
      payment: {
        provider,
        state: 'cancelled',
        transactionId,
        cancelReason: reason,
        cancelledAt,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.error('cancelPayment failed', { orderId, err });
  }
}

/** Constant-time string compare, so a bad secret cannot be probed by timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
