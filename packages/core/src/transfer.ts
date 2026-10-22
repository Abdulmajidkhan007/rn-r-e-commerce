import { z } from 'zod';
import type { Order } from './order';
import { TimestampSchema } from './product';

// --- settings/payment ---------------------------------------------------------

/** Uzcard / Humo / Visa / Mastercard numbers shown to customers are 16 digits. */
export const CARD_NUMBER_DIGITS = 16;

/** Keeps only the digits of a typed or pasted card number. */
export function normalizeCardNumber(input: string): string {
  return input.replace(/\D/g, '');
}

/** `8600000000000000` → `8600 0000 0000 0000` (any input, digits only, groups of 4). */
export function formatCardNumber(input: string): string {
  return (normalizeCardNumber(input).match(/.{1,4}/g) ?? []).join(' ');
}

export function isCardNumber(input: string): boolean {
  return new RegExp(`^\\d{${CARD_NUMBER_DIGITS}}$`).test(input);
}

/**
 * settings/payment — one document, public read, admin write. The card is shown
 * to customers so they can transfer the deposit; it is display-only and never
 * charged by the app. While transfers are on, a valid card and holder are
 * required; when off, the fields may be left empty.
 */
export const PaymentSettingsSchema = z
  .object({
    transferEnabled: z.boolean(),
    /** Digits only; formatted for display with `formatCardNumber`. */
    cardNumber: z.string().max(CARD_NUMBER_DIGITS),
    cardHolder: z.string().trim().max(80),
    bank: z.string().trim().max(80),
    /** Free text shown under the card (e.g. "write the order number"). */
    note: z.string().trim().max(500),
  })
  .superRefine((s, ctx) => {
    if (s.cardNumber !== '' && !isCardNumber(s.cardNumber)) {
      ctx.addIssue({ code: 'custom', path: ['cardNumber'], message: 'cardNumber' });
    }
    if (s.transferEnabled && s.cardNumber === '') {
      ctx.addIssue({ code: 'custom', path: ['cardNumber'], message: 'cardNumber' });
    }
    if (s.transferEnabled && s.cardHolder.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['cardHolder'], message: 'cardHolder' });
    }
  });
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;

/** Card transfer is offered at checkout only when switched on with a usable card. */
export function isTransferAvailable(settings: PaymentSettings | null | undefined): boolean {
  return (
    !!settings &&
    settings.transferEnabled &&
    isCardNumber(settings.cardNumber) &&
    settings.cardHolder.length >= 2
  );
}

// --- receipts/{id} ------------------------------------------------------------

export const ReceiptStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type ReceiptStatus = z.infer<typeof ReceiptStatusSchema>;

/** At most this many receipts per order — rejected ones count too. */
export const MAX_RECEIPTS_PER_ORDER = 5;
export const RECEIPT_NOTE_MAX = 500;

/**
 * A payment receipt photo for a `transfer` order, stored in Firestore
 * (`receipts/{orderId}_r{n}`) while the project has no Storage bucket. Same
 * compression budget as product photos; JPEG only (no PDF until Storage).
 */
export const ReceiptSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  userId: z.string(),
  /** `data:image/jpeg;base64,…`, compressed on the device before the write. */
  data: z.string().startsWith('data:image/jpeg;base64,'),
  status: ReceiptStatusSchema,
  createdAt: TimestampSchema,
  /** Admin uid, set together with `reviewedAt` when approved or rejected. */
  reviewedBy: z.string().optional(),
  reviewedAt: TimestampSchema.optional(),
  /** Admin's reason, mainly for a rejection; shown to the customer. */
  note: z.string().max(RECEIPT_NOTE_MAX).optional(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;

/**
 * Receipt ids are slots `{orderId}_r1` … `_r5`. The rules accept only these
 * ids and a create never overwrites, so the per-order cap needs no counter
 * on the order (which the customer could not be trusted to maintain).
 */
export function receiptId(orderId: string, slot: number): string {
  return `${orderId}_r${slot}`;
}

/** First free slot (1-based), or null when all are used. */
export function nextReceiptSlot(
  orderId: string,
  existing: readonly Pick<Receipt, 'id'>[],
): number | null {
  const used = new Set(existing.map((r) => r.id));
  for (let slot = 1; slot <= MAX_RECEIPTS_PER_ORDER; slot += 1) {
    if (!used.has(receiptId(orderId, slot))) return slot;
  }
  return null;
}

export type ReceiptUploadBlock = 'notTransfer' | 'notPending' | 'approved' | 'limit';

/**
 * Why the customer may not upload another receipt, or null if they may.
 * Mirrors the receipts create rule (pending transfer order, free slot).
 */
export function receiptUploadBlock(
  order: Pick<Order, 'status' | 'payment'>,
  receipts: readonly Pick<Receipt, 'status'>[],
): ReceiptUploadBlock | null {
  if (order.payment?.provider !== 'transfer') return 'notTransfer';
  if (order.status !== 'pending') return 'notPending';
  if (receipts.some((r) => r.status === 'approved')) return 'approved';
  if (receipts.length >= MAX_RECEIPTS_PER_ORDER) return 'limit';
  return null;
}

/** Newest first — the order the customer and admin read them in. */
export function sortReceipts<T extends Pick<Receipt, 'createdAt'>>(receipts: readonly T[]): T[] {
  return [...receipts].sort((a, b) => b.createdAt - a.createdAt);
}

/** Orders with receipts waiting for review, counted per order id. */
export function pendingReceiptCounts(
  receipts: readonly Pick<Receipt, 'orderId' | 'status'>[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of receipts) {
    if (r.status === 'pending') counts.set(r.orderId, (counts.get(r.orderId) ?? 0) + 1);
  }
  return counts;
}
