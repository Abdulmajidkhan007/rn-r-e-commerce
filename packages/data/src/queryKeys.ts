export type ProductSort = 'newest' | 'priceAsc' | 'priceDesc';

export interface ProductsParams {
  categoryId?: string;
  /** Client-side free-text search across localized names. */
  search?: string;
  sort?: ProductSort;
}

/**
 * Typed query-key factory. Only server-affecting params (categoryId) are part
 * of the products key — search/sort are applied client-side, so they must not
 * trigger refetches.
 */
export const queryKeys = {
  categories: ['categories'] as const,
  products: (params: ProductsParams = {}) =>
    ['products', { categoryId: params.categoryId ?? null }] as const,
  product: (id: string) => ['product', id] as const,
};
