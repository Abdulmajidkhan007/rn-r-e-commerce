import {
  type Unsubscribe,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  RECEIPT_NOTE_MAX,
  ReceiptSchema,
  nextReceiptSlot,
  receiptId,
  receiptUploadBlock,
  sortReceipts,
  stockActionFor,
  type Order,
  type Receipt,
  type ReceiptUploadBlock,
} from '@kidswear/core';
import { INLINE_IMAGE_MAX_DATA_URL_CHARS } from '@kidswear/utils';
import { getDb } from './app';
import { COLLECTIONS, orderDoc } from './collections';
import { createConverter } from './converters';
import type { EncodedImage } from './productImages';

export type ReceiptErrorCode =
  | ReceiptUploadBlock
  | 'tooLarge'
  | 'notJpeg'
  | 'notFound'
  | 'alreadyReviewed'
  | 'orderNotPending'
  | 'noteRequired';

/** A refused receipt action; `message` is an i18n key. Nothing was written. */
export class ReceiptError extends Error {
  readonly code: ReceiptErrorCode;

  constructor(code: ReceiptErrorCode) {
    super(`receipts.errors.${code}`);
    this.name = 'ReceiptError';
    this.code = code;
  }
}

const JPEG_PREFIX = 'data:image/jpeg;base64,';
const receiptConverter = createConverter(ReceiptSchema);

/** Raw collection for writes: the converter stamps `updatedAt`, which the rules forbid. */
function receiptsRaw() {
  return collection(getDb(), COLLECTIONS.receipts);
}

function receiptsCol() {
  return receiptsRaw().withConverter(receiptConverter);
}

/**
 * Owner: saves a compressed receipt photo for their pending `transfer` order
 * into the next free slot (`{orderId}_r1…5`). `existing` is the live list the
 * screen already shows; if it is stale and the slot was taken meanwhile, the
 * rules refuse the write (a create never overwrites).
 */
export async function uploadReceipt(
  order: Order,
  existing: readonly Receipt[],
  userId: string,
  image: EncodedImage,
): Promise<string> {
  const block = receiptUploadBlock(order, existing);
  if (block) throw new ReceiptError(block);
  const slot = nextReceiptSlot(order.id, existing);
  if (slot === null) throw new ReceiptError('limit');

  const data = await image.dataUrl();
  if (!data.startsWith(JPEG_PREFIX)) throw new ReceiptError('notJpeg');
  if (data.length > INLINE_IMAGE_MAX_DATA_URL_CHARS) throw new ReceiptError('tooLarge');

  const id = receiptId(order.id, slot);
  await setDoc(doc(receiptsRaw(), id), {
    orderId: order.id,
    userId,
    data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return id;
}

/**
 * Live receipts of one order, newest first. Customers must pass their uid: the
 * rules only allow a query that is provably limited to their own receipts.
 * Admins pass null.
 */
export function subscribeOrderReceipts(
  orderId: string,
  userId: string | null,
  cb: (receipts: Receipt[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = userId
    ? query(receiptsCol(), where('orderId', '==', orderId), where('userId', '==', userId))
    : query(receiptsCol(), where('orderId', '==', orderId));
  return onSnapshot(
    q,
    (snap) => cb(sortReceipts(snap.docs.map((d) => d.data()))),
    (error) => onError?.(error),
  );
}

/** Admin: every receipt still waiting for review (for the orders list badge). */
export function subscribePendingReceipts(
  cb: (receipts: Receipt[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(receiptsCol(), where('status', '==', 'pending')),
    (snap) => cb(snap.docs.map((d) => d.data())),
    (error) => onError?.(error),
  );
}

export interface ReceiptReview {
  receiptId: string;
  decision: 'approved' | 'rejected';
  /** Admin uid. */
  by: string;
  /** Required for a rejection — the customer sees it. */
  note?: string;
}

/**
 * Admin: approves or rejects a pending receipt. Approval marks the order
 * `deposit_paid` with `paidAmount = depositAmount` in the same transaction, so a
 * receipt is never approved without the order being paid (or the reverse).
 * pending → deposit_paid moves no stock (`stockActionFor`, Faza 3); stock is
 * still taken later by `changeOrderStatus` when the admin confirms.
 */
export async function reviewReceipt({
  receiptId: id,
  decision,
  by,
  note,
}: ReceiptReview): Promise<void> {
  const trimmed = note?.trim().slice(0, RECEIPT_NOTE_MAX) ?? '';
  if (decision === 'rejected' && trimmed === '') throw new ReceiptError('noteRequired');

  await runTransaction(getDb(), async (tx) => {
    const ref = doc(receiptsCol(), id);
    const snap = await tx.get(ref);
    const receipt = snap.exists() ? snap.data() : null;
    if (!receipt) throw new ReceiptError('notFound');
    if (receipt.status !== 'pending') throw new ReceiptError('alreadyReviewed');

    const reviewed = {
      status: decision,
      reviewedBy: by,
      reviewedAt: serverTimestamp(),
      ...(trimmed ? { note: trimmed } : {}),
    };

    if (decision === 'rejected') {
      tx.update(ref, reviewed);
      return;
    }

    const orderRef = orderDoc(receipt.orderId);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.exists() ? orderSnap.data() : null;
    if (
      !order ||
      order.status !== 'pending' ||
      order.payment?.provider !== 'transfer' ||
      stockActionFor(order.status, 'deposit_paid', order.stockApplied === true) !== 'none'
    ) {
      throw new ReceiptError('orderNotPending');
    }

    tx.update(ref, reviewed);
    tx.update(orderRef, {
      status: 'deposit_paid',
      paidAmount: order.depositAmount,
      'payment.state': 'paid',
      'payment.paidAt': Date.now(),
      'payment.transactionId': id,
      updatedAt: serverTimestamp(),
    });
  });
}
