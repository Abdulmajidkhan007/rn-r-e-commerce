import type { Product } from '@kidswear/core';
import type { ProductSort } from './queryKeys';

/**
 * Client-side catalog search + sort, extracted from the hook so it is directly
 * unit-testable and reusable if the same predicate has to be mirrored
 * server-side. Pure: never mutates its input.
 */

/** Case-insensitive substring match across all localized names. */
export function matchesSearch(product: Product, term: string): boolean {
  const haystack = [product.name.uz, product.name.en, product.name.ru]
    .filter((s): s is string => !!s)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function sortProducts(products: Product[], sort: ProductSort | undefined): Product[] {
  if (sort === 'priceAsc') return [...products].sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') return [...products].sort((a, b) => b.price - a.price);
  // 'newest' (default) — the server already returns createdAt desc.
  return products;
}

/** Applies search then sort, in the order the catalog screens expect. */
export function filterAndSortProducts(
  products: Product[],
  search: string | undefined,
  sort: ProductSort | undefined,
): Product[] {
  const term = search?.trim().toLowerCase();
  const filtered = term ? products.filter((p) => matchesSearch(p, term)) : products;
  return sortProducts(filtered, sort);
}
