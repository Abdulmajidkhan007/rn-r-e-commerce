export type ProductSort = 'newest' | 'priceAsc' | 'priceDesc';

export interface ProductsParams {
  categoryId?: string;
  /** Free-text search; normalized to a single token and matched server-side. */
  search?: string;
  sort?: ProductSort;
}

/** Products fetched per page by the infinite catalog query. */
export const PRODUCTS_PAGE_SIZE = 24;

/**
 * Typed query-key factory.
 *
 * Search and sort are now part of the products key: both are resolved by
 * Firestore, so changing either is a different server query and must refetch.
 * (They used to be client-side only, and were deliberately excluded.)
 */
export const queryKeys = {
  categories: ['categories'] as const,
  products: (params: ProductsParams = {}) =>
    [
      'products',
      {
        categoryId: params.categoryId ?? null,
        search: params.search?.trim().toLowerCase() || null,
        sort: params.sort ?? 'newest',
      },
    ] as const,
  product: (id: string) => ['product', id] as const,
};
