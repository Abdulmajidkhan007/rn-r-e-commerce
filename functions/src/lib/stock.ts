import type { OrderItem, ProductVariant } from '../types.js';

/** The product fields stock maths reads. */
export interface StockedProduct {
  stock?: number;
  variants?: ProductVariant[];
}

export type StockUpdate = { stock: number; variants?: ProductVariant[] };

/**
 * New stock for one product after an order's lines for it, or `null` if any
 * line cannot be covered. Mirrors @kidswear/core `resolveLineVariant`: a line
 * finds its variant by `variantId`, else by size/colour; a product without
 * variants sells every line from its single `stock`. Product `stock` stays the
 * variants' sum.
 */
export function applyLinesToStock(
  product: StockedProduct,
  lines: readonly OrderItem[],
): StockUpdate | null {
  const stock = product.stock ?? 0;
  const variants = product.variants ?? [];
  const qty = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (variants.length === 0) {
    return qty <= stock ? { stock: stock - qty } : null;
  }

  const next = variants.map((v) => ({ ...v }));
  for (const line of lines) {
    const variant = line.variantId
      ? next.find((v) => v.id === line.variantId)
      : next.find((v) => v.size === (line.size ?? '') && v.color === (line.color ?? ''));
    if (!variant || variant.stock < line.quantity) return null;
    variant.stock -= line.quantity;
  }
  return { stock: next.reduce((sum, v) => sum + v.stock, 0), variants: next };
}

/** Mirror of @kidswear/core DEFAULT_VARIANT_ID. */
export const DEFAULT_VARIANT_ID = 'default';

/**
 * Journal rows (`stockMoves`) for a sale `applyLinesToStock` accepted: one per
 * variant, negative. Mirrors @kidswear/core `orderLinesStockChange` deltas.
 */
export function saleMoves(
  product: StockedProduct,
  lines: readonly OrderItem[],
): { variantId: string; delta: number }[] {
  const variants = product.variants ?? [];
  const byVariant = new Map<string, number>();
  for (const line of lines) {
    const variant =
      variants.length === 0
        ? undefined
        : line.variantId
          ? variants.find((v) => v.id === line.variantId)
          : variants.find((v) => v.size === (line.size ?? '') && v.color === (line.color ?? ''));
    const id = variant?.id ?? DEFAULT_VARIANT_ID;
    byVariant.set(id, (byVariant.get(id) ?? 0) - line.quantity);
  }
  return [...byVariant].map(([variantId, delta]) => ({ variantId, delta }));
}
