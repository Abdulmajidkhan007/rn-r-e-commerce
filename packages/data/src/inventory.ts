import { DEFAULT_VARIANT_ID, variantLabel, type Order } from '@kidswear/core';
import { InventoryError } from '@kidswear/firebase';

/** An i18n key plus its interpolation values — the UI calls `t(key, params)`. */
export interface StockErrorMessage {
  key: string;
  params?: { name: string; variant: string };
}

/**
 * What to tell the admin when a status change or stock move was refused.
 * A shortfall names the order line that ran out, so the admin knows which
 * size to restock; anything else falls back to a generic key.
 */
export function stockErrorMessage(error: unknown, order?: Order): StockErrorMessage {
  if (!(error instanceof InventoryError)) return { key: 'inventory.errors.generic' };
  if (error.code === 'insufficient' && order && error.productId) {
    const line =
      order.items.find(
        (i) =>
          i.productId === error.productId &&
          (error.variantId === DEFAULT_VARIANT_ID ||
            !i.variantId ||
            i.variantId === error.variantId),
      ) ?? order.items.find((i) => i.productId === error.productId);
    if (line) {
      const variant = variantLabel(line) || '—';
      return { key: 'inventory.shortfallFor', params: { name: line.name, variant } };
    }
  }
  return { key: error.message };
}
