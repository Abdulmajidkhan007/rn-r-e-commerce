import { z } from 'zod';
import { TimestampSchema } from './product';

export const PromoTypeSchema = z.enum(['percent', 'fixed']);
export type PromoType = z.infer<typeof PromoTypeSchema>;

/**
 * A promo code. The document id IS the code (upper-case), so the checkout can
 * `get` one by exact id while listing stays admin-only — codes cannot be
 * enumerated from the client.
 */
export const PromoCodeSchema = z.object({
  id: z.string().regex(/^[A-Z0-9]{3,20}$/),
  type: PromoTypeSchema,
  /** percent: 1..90; fixed: UZS integer som. */
  value: z.number().int().positive(),
  /** Subtotal (UZS) the cart must reach before the code applies. */
  minSubtotal: z.number().int().nonnegative(),
  active: z.boolean(),
  /** Epoch millis; absent = no expiry. */
  expiresAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type PromoCode = z.infer<typeof PromoCodeSchema>;

/** Normalizes user input to the stored id form. */
export function normalizePromoCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export type PromoRejection = 'notFound' | 'inactive' | 'expired' | 'minSubtotal';

/**
 * The discount a code gives on a subtotal, or why it does not apply.
 * Mirrors the check in firestore.rules (orders create) — keep them in sync:
 * percent → floor(subtotal × value / 100); fixed → min(value, subtotal).
 */
export function evaluatePromo(
  promo: PromoCode | null | undefined,
  subtotal: number,
  now: number,
): { ok: true; discount: number } | { ok: false; reason: PromoRejection } {
  if (!promo) return { ok: false, reason: 'notFound' };
  if (!promo.active) return { ok: false, reason: 'inactive' };
  if (promo.expiresAt !== undefined && promo.expiresAt <= now)
    return { ok: false, reason: 'expired' };
  if (subtotal < promo.minSubtotal) return { ok: false, reason: 'minSubtotal' };
  const discount =
    promo.type === 'percent'
      ? Math.floor((subtotal * promo.value) / 100)
      : Math.min(promo.value, subtotal);
  return { ok: true, discount };
}
