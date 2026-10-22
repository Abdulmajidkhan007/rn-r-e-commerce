import { z } from 'zod';
import type { OrderStatus } from './order';
import { TimestampSchema } from './product';
import {
  isLegacyProduct,
  productVariants,
  resolveLineVariant,
  totalVariantStock,
  type ProductVariant,
  type VariantRef,
  type VariantSource,
} from './variant';

/** Why a stock level changed — one journal entry per variant per action. */
export const StockMoveReasonSchema = z.enum(['sale', 'return', 'intake', 'writeoff', 'inventory']);
export type StockMoveReason = z.infer<typeof StockMoveReasonSchema>;

/** `stockMoves/{id}` — append-only stock journal, admin-only. */
export const StockMoveSchema = z.object({
  id: z.string(),
  productId: z.string().min(1),
  /** `DEFAULT_VARIANT_ID` for a product without variants. */
  variantId: z.string().min(1),
  /** Signed change in units; never 0. */
  delta: z.number().int(),
  reason: StockMoveReasonSchema,
  orderId: z.string().optional(),
  note: z.string().max(500).optional(),
  /** Uid of the admin (or 'system' for the Blaze trigger). */
  by: z.string().min(1),
  createdAt: TimestampSchema,
});
export type StockMove = z.infer<typeof StockMoveSchema>;

/**
 * Statuses in which an order's goods have left the shelf. Entering one of them
 * takes stock (once); leaving them — cancelling, or moving back to an unpaid
 * state — puts it back.
 */
export const STOCK_HOLDING_STATUSES: readonly OrderStatus[] = [
  'processing',
  'shipped',
  'delivered',
];

/** A customer may cancel only before the shop has acted on the order. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === 'pending';
}

export type StockAction = 'apply' | 'return' | 'none';

/**
 * What a status change must do to stock, given whether this order's stock is
 * already taken (`stockApplied`). The flag makes it idempotent: re-saving a
 * status, or going processing → shipped, does nothing. Re-saving the current
 * status never moves stock either — on Blaze `onOrderCreate` takes the stock
 * while the order is still `deposit_paid`.
 */
export function stockActionFor(
  current: OrderStatus,
  next: OrderStatus,
  stockApplied: boolean,
): StockAction {
  if (current === next) return 'none';
  const holds = STOCK_HOLDING_STATUSES.includes(next);
  if (holds && !stockApplied) return 'apply';
  if (!holds && stockApplied) return 'return';
  return 'none';
}

/** The product fields a stock write sets: `stock` stays the variants' sum. */
export interface StockPatch {
  stock: number;
  variants?: ProductVariant[];
}

/** One journal-worthy change to one variant. */
export interface VariantDelta {
  variantId: string;
  delta: number;
}

export type StockChangeError = 'insufficient' | 'missingVariant';

export type StockChange =
  | { ok: true; patch: StockPatch; deltas: VariantDelta[] }
  | { ok: false; error: StockChangeError; variantId?: string };

/**
 * Applies signed per-variant deltas to a product. Fails without touching
 * anything if a variant is unknown or would go negative. Deltas on the same
 * variant are merged, so the journal gets one row per variant.
 */
export function applyVariantDeltas(
  product: VariantSource,
  deltas: readonly VariantDelta[],
): StockChange {
  const merged = new Map<string, number>();
  for (const d of deltas) merged.set(d.variantId, (merged.get(d.variantId) ?? 0) + d.delta);

  const variants = productVariants(product).map((v) => ({ ...v }));
  for (const [variantId, delta] of merged) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return { ok: false, error: 'missingVariant', variantId };
    if (variant.stock + delta < 0) return { ok: false, error: 'insufficient', variantId };
    variant.stock += delta;
  }

  const out = [...merged]
    .filter(([, delta]) => delta !== 0)
    .map(([variantId, delta]) => ({ variantId, delta }));
  // A legacy product keeps its single `stock` field; its synthetic default
  // variant is never written back.
  const patch: StockPatch = isLegacyProduct(product)
    ? { stock: variants[0]?.stock ?? 0 }
    : { stock: totalVariantStock(variants), variants };
  return { ok: true, patch, deltas: out };
}

/** An order line as stock maths reads it. */
export type StockLine = VariantRef & { quantity: number };

/**
 * Stock change for one product's lines of an order: `sale` takes the
 * quantities, `return` puts them back. A sale fails on a missing variant or a
 * shortfall. A return skips lines whose variant no longer exists (the admin
 * removed that size) rather than block the cancellation.
 */
export function orderLinesStockChange(
  product: VariantSource,
  lines: readonly StockLine[],
  direction: 'sale' | 'return',
): StockChange {
  const deltas: VariantDelta[] = [];
  for (const line of lines) {
    const variant = resolveLineVariant(product, line);
    if (!variant) {
      if (direction === 'return') continue;
      return {
        ok: false,
        error: 'missingVariant',
        ...(line.variantId ? { variantId: line.variantId } : {}),
      };
    }
    deltas.push({
      variantId: variant.id,
      delta: direction === 'sale' ? -line.quantity : line.quantity,
    });
  }
  return applyVariantDeltas(product, deltas);
}

/**
 * Delta an inventory count produces: counted − recorded. Unknown variant →
 * `null`.
 */
export function inventoryDelta(
  product: VariantSource,
  variantId: string,
  counted: number,
): number | null {
  const variant = productVariants(product).find((v) => v.id === variantId);
  return variant ? counted - variant.stock : null;
}

/**
 * Signed delta for a manual warehouse action. `quantity` is what the admin
 * typed: units received/written off, or the counted total for `inventory`.
 */
export function manualStockDelta(
  product: VariantSource,
  variantId: string,
  reason: 'intake' | 'writeoff' | 'inventory',
  quantity: number,
): number | null {
  if (reason === 'intake') return quantity;
  if (reason === 'writeoff') return -quantity;
  return inventoryDelta(product, variantId, quantity);
}

/** "M / Red" for a variant; '' for a legacy product's single default variant. */
export function variantLabel(variant: Pick<ProductVariant, 'size' | 'color'>): string {
  return [variant.size, variant.color].filter(Boolean).join(' / ');
}
