import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Category, Product } from '@kidswear/core';
import { getCategories, getProductById, getProducts } from '@kidswear/firebase';
import { queryKeys, type ProductsParams, type ProductSort } from './queryKeys';

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
  });
}

function matchesSearch(product: Product, term: string): boolean {
  const haystack = [product.name.uz, product.name.en, product.name.ru]
    .filter((s): s is string => !!s)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

function sortProducts(products: Product[], sort: ProductSort | undefined): Product[] {
  if (sort === 'priceAsc') return [...products].sort((a, b) => a.price - b.price);
  if (sort === 'priceDesc') return [...products].sort((a, b) => b.price - a.price);
  // 'newest' (default) — the server already returns createdAt desc.
  return products;
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

  const products = useMemo(() => {
    const list = query.data ?? [];
    const term = params.search?.trim().toLowerCase();
    const filtered = term ? list.filter((p) => matchesSearch(p, term)) : list;
    return sortProducts(filtered, params.sort);
  }, [query.data, params.search, params.sort]);

  return { ...query, products };
}

export function useProduct(id: string): UseQueryResult<Product | null> {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
}
