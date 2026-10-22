import { useEffect, useState } from 'react';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { pendingReceiptCounts, type Order, type Receipt } from '@kidswear/core';
import {
  ReceiptError,
  reviewReceipt,
  subscribeOrderReceipts,
  subscribePendingReceipts,
  uploadReceipt,
  type EncodedImage,
  type ReceiptReview,
} from '@kidswear/firebase';
import { ImageTooLargeError } from '@kidswear/utils';

export interface OrderReceiptsState {
  receipts: Receipt[];
  loading: boolean;
  error: boolean;
}

/**
 * Live receipts of an order. A customer passes their uid (the rules only allow
 * a query limited to their own receipts); an admin passes `asAdmin`.
 */
export function useOrderReceipts(
  orderId: string | undefined,
  uid: string | undefined,
  asAdmin = false,
): OrderReceiptsState {
  const key = orderId && (asAdmin || uid) ? `${orderId}:${asAdmin ? '' : uid}` : null;
  // Tagged with the query it answers, so switching orders never shows stale rows.
  const [snapshot, setSnapshot] = useState<{ key: string; state: OrderReceiptsState } | null>(null);

  useEffect(() => {
    if (!key || !orderId) return;
    return subscribeOrderReceipts(
      orderId,
      asAdmin ? null : (uid ?? null),
      (receipts) => setSnapshot({ key, state: { receipts, loading: false, error: false } }),
      () => setSnapshot({ key, state: { receipts: [], loading: false, error: true } }),
    );
  }, [key, orderId, uid, asAdmin]);

  if (!key) return { receipts: [], loading: false, error: false };
  return snapshot?.key === key ? snapshot.state : { receipts: [], loading: true, error: false };
}

/** Admin: pending receipt count per order id, live. */
export function usePendingReceiptCounts(enabled: boolean): ReadonlyMap<string, number> {
  const [counts, setCounts] = useState<ReadonlyMap<string, number>>(new Map());
  useEffect(() => {
    if (!enabled) return;
    return subscribePendingReceipts((receipts) => setCounts(pendingReceiptCounts(receipts)));
  }, [enabled]);
  return enabled ? counts : new Map();
}

/** Maps a receipt failure to an i18n key. */
export function receiptErrorKey(error: unknown): string {
  if (error instanceof ReceiptError) return error.message;
  if (error instanceof ImageTooLargeError) return 'receipts.errors.tooLarge';
  return 'receipts.errors.generic';
}

export interface UploadReceiptVars {
  order: Order;
  existing: readonly Receipt[];
  userId: string;
  image: EncodedImage;
}

export function useUploadReceipt(): UseMutationResult<string, Error, UploadReceiptVars> {
  return useMutation<string, Error, UploadReceiptVars>({
    mutationFn: ({ order, existing, userId, image }) =>
      uploadReceipt(order, existing, userId, image),
  });
}

export function useReviewReceipt(): UseMutationResult<void, Error, ReceiptReview> {
  return useMutation({ mutationFn: reviewReceipt });
}
