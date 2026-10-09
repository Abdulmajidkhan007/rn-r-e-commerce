import type { Product } from '@kidswear/core';

/** Products whose old price is above the current one, biggest discount first. */
export function pickDeals(products: readonly Product[], count: number): Product[] {
  const ratio = (p: Product): number => (p.compareAtPrice ?? 0) / p.price;
  return products
    .filter((p) => p.price > 0 && (p.compareAtPrice ?? 0) > p.price)
    .sort((a, b) => ratio(b) - ratio(a))
    .slice(0, count);
}
