import { z } from 'zod';
import type { OrderItem } from './order';
import { TimestampSchema } from './product';
import { DEFAULT_VARIANT_ID } from './variant';

const MoneySchema = z.number().int().nonnegative();

/**
 * `productCosts/{productId}` — the purchase cost of a product, admin-only.
 * Kept out of `products` because products are publicly readable. `cost` is the
 * product-wide default; `variants` overrides it per variant id (the same ids
 * as `Product.variants`, `DEFAULT_VARIANT_ID` for a product without variants).
 */
export const ProductCostSchema = z.object({
  /** = productId. */
  id: z.string(),
  /** UZS per unit. Absent → only the per-variant values apply. */
  cost: MoneySchema.optional(),
  variants: z.record(z.string(), MoneySchema).default({}),
  updatedBy: z.string().optional(),
  updatedAt: TimestampSchema.optional(),
});
export type ProductCost = z.infer<typeof ProductCostSchema>;

/** The editable part of a cost document. */
export type ProductCostInput = Pick<ProductCost, 'cost' | 'variants'>;

/** One order line as costed at confirmation time. */
export const OrderCostLineSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().int().positive(),
  /** Sale price per unit (copied from the order line). */
  price: MoneySchema,
  /** Cost per unit; `null` when no cost was set for this variant then. */
  unitCost: MoneySchema.nullable(),
});
export type OrderCostLine = z.infer<typeof OrderCostLineSchema>;

/**
 * `orderCosts/{orderId}` — immutable snapshot of what an order's goods cost
 * when the admin confirmed it, so later cost edits never rewrite past profit.
 * Admin-only, create-once.
 */
export const OrderCostSchema = z.object({
  /** = orderId. */
  id: z.string(),
  lines: z.array(OrderCostLineSchema),
  /** Σ unitCost × quantity over the lines that have a cost. */
  totalCost: MoneySchema,
  /** Lines without a cost — the order is left out of profit while > 0. */
  missingLines: z.number().int().nonnegative(),
  /** True when written after the fact from the then-current costs. */
  backfilled: z.boolean().optional(),
  by: z.string(),
  createdAt: TimestampSchema,
});
export type OrderCost = z.infer<typeof OrderCostSchema>;

/** Unit cost of one variant: its own value, else the product default. */
export function unitCostFor(
  cost: Pick<ProductCost, 'cost' | 'variants'> | null | undefined,
  variantId: string,
): number | null {
  if (!cost) return null;
  return cost.variants[variantId] ?? cost.cost ?? null;
}

/**
 * Normalises admin input: drops blank/invalid per-variant values and those
 * equal to the default (they would only hide a later default change).
 */
export function normalizeProductCost(
  input: { cost?: number | undefined; variants: Record<string, number | undefined> },
  variantIds: readonly string[],
): ProductCostInput {
  const ok = (n: number | undefined): n is number =>
    n !== undefined && Number.isInteger(n) && n >= 0;
  const variants: Record<string, number> = {};
  const live = new Set(variantIds);
  for (const [id, value] of Object.entries(input.variants)) {
    if (live.has(id) && ok(value) && value !== input.cost) variants[id] = value;
  }
  return ok(input.cost) ? { cost: input.cost, variants } : { variants };
}

/**
 * Builds the cost snapshot of an order's lines. `variantIdOf` resolves a line
 * to its variant (legacy lines carry no `variantId`); `costs` holds the cost
 * document of every product on the order (missing → `null`).
 */
export function buildOrderCostLines(
  items: readonly OrderItem[],
  costs: ReadonlyMap<string, ProductCostInput | null>,
  variantIdOf: (item: OrderItem) => string | undefined = (item) => item.variantId,
): Pick<OrderCost, 'lines' | 'totalCost' | 'missingLines'> {
  const lines: OrderCostLine[] = items.map((item) => {
    const variantId = variantIdOf(item) ?? DEFAULT_VARIANT_ID;
    return {
      productId: item.productId,
      variantId,
      quantity: item.quantity,
      price: item.price,
      unitCost: unitCostFor(costs.get(item.productId), variantId),
    };
  });
  return {
    lines,
    totalCost: lines.reduce((sum, l) => sum + (l.unitCost ?? 0) * l.quantity, 0),
    missingLines: lines.filter((l) => l.unitCost === null).length,
  };
}
