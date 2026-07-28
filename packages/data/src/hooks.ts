import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Category, Product } from '@kidswear/core';
import { getCategories, getProductById, getProducts } from '@kidswear/firebase';
import { queryKeys, type ProductsParams } from './queryKeys';
import { filterAndSortProducts } from './catalogFilter';

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
  });
}

/** Query result plus the client-side search + sort derived list. */
export type UseProductsResult = UseQueryResult<Product[]> & {
  products: Product[];
};

/**
 * Fetches active products (optionally category-filtered server-side), then
 * applies client-side search + sort. Search/sort are memoized and do not refetch.
 */
export function useProducts(params: ProductsParams = {}): UseProductsResult {
  const query = useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => getProducts({ categoryId: params.categoryId, isActive: true }),
  });

  const products = useMemo(
    () => filterAndSortProducts(query.data ?? [], params.search, params.sort),
    [query.data, params.search, params.sort],
  );

  return { ...query, products };
}

export function useProduct(id: string): UseQueryResult<Product | null> {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
}
