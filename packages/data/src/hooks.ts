import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Category, Product } from '@kidswear/core';
import { getCategories, getProductById, getProductPage, type ProductPage } from '@kidswear/firebase';
import { searchQueryToken } from '@kidswear/utils';
import { PRODUCTS_PAGE_SIZE, queryKeys, type ProductsParams } from './queryKeys';

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
  });
}

export interface UseProductsResult {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** True while an additional page is in flight. */
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  /** Pull-to-refresh support. */
  isRefetching: boolean;
  refetch: () => void;
}

/**
 * Paginated catalog query.
 *
 * Category filter, free-text search and sort are all resolved by Firestore, and
 * results arrive one page at a time — the catalog is never downloaded whole.
 * Search matches the denormalized `searchTokens` array (see
 * `@kidswear/utils.buildSearchTokens`), which is what makes it indexable at all:
 * Firestore has no substring operator.
 */
export function useProducts(params: ProductsParams = {}): UseProductsResult {
  const searchToken = useMemo(
    () => (params.search ? searchQueryToken(params.search) : null),
    [params.search],
  );

  const query = useInfiniteQuery<ProductPage>({
    queryKey: queryKeys.products(params),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getProductPage({
        ...(params.categoryId !== undefined ? { categoryId: params.categoryId } : {}),
        isActive: true,
        ...(searchToken ? { searchToken } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
        limit: PRODUCTS_PAGE_SIZE,
        cursor: (pageParam as ProductPage['cursor']) ?? undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });

  const products = useMemo(
    () => query.data?.pages.flatMap((page) => page.products) ?? [],
    [query.data],
  );

  return {
    products,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    isRefetching: query.isRefetching,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useProduct(id: string): UseQueryResult<Product | null> {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
}
