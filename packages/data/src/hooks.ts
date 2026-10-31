import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  applyClientFilters,
  collectSizes,
  gendersFor,
  hasClientFilters,
  isStorefrontVisible,
  pickSimilar,
  type Category,
  type Product,
} from '@kidswear/core';
import {
  countActiveProducts,
  getCategories,
  getProducts,
  getProductById,
  getProductPage,
  type ProductPage,
} from '@kidswear/firebase';
import { searchQueryToken } from '@kidswear/utils';
import { PRODUCTS_PAGE_SIZE, queryKeys, type ProductsParams } from './queryKeys';

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
  });
}

/** Pages fetched on top of the first while client-side filters leave a page short. */
const MAX_FILTER_PAGES = 8;

/**
 * Categories that currently have at least one active product (count
 * aggregations, no documents read). Until the counts arrive every category is
 * returned so the chips do not flicker.
 */
export function useCategoriesWithProducts(): UseQueryResult<Category[]> {
  const categories = useCategories();
  const list = categories.data;
  return useQuery({
    queryKey: ['categoriesWithProducts', list?.map((c) => c.id).join(',') ?? ''],
    enabled: !!list,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const counts = await Promise.all((list ?? []).map((c) => countActiveProducts(c.id)));
      return (list ?? []).filter((_, i) => (counts[i] ?? 0) > 0);
    },
    placeholderData: list,
  });
}

/**
 * Size labels offered by the size filter: the distinct sizes of (up to 200) active
 * products, optionally within one category. Cached for a few minutes.
 */
export function useSizeOptions(categoryId?: string): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ['sizeOptions', categoryId ?? null],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const products = await getProducts({
        isActive: true,
        ...(categoryId !== undefined ? { categoryId } : {}),
        limit: 200,
      });
      return collectSizes(products.filter(isStorefrontVisible));
    },
  });
}

/** "O'xshashlar": products most like `product` (see `pickSimilar`), from its category. */
export function useSimilarProducts(
  product: Product | null | undefined,
  limit = 8,
): {
  products: Product[];
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['similar', product?.categoryId ?? null],
    enabled: !!product,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      getProducts({ isActive: true, categoryId: product?.categoryId ?? '', limit: 60 }),
  });
  const products = useMemo(
    () => (product && query.data ? pickSimilar(product, query.data, limit) : []),
    [product, query.data, limit],
  );
  return { products, isLoading: query.isLoading };
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

  const filters = params.filters;
  const gender = filters?.gender;
  const size = filters?.size;
  const clientFiltered = hasClientFilters(filters ?? {}, !!searchToken);

  const query = useInfiniteQuery<ProductPage>({
    queryKey: queryKeys.products(params),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getProductPage({
        ...(params.categoryId !== undefined ? { categoryId: params.categoryId } : {}),
        isActive: true,
        ...(searchToken ? { searchToken } : {}),
        ...(size !== undefined ? { size } : {}),
        ...(gender !== undefined ? { genders: gendersFor(gender) } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
        limit: PRODUCTS_PAGE_SIZE,
        cursor: (pageParam as ProductPage['cursor']) ?? undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });

  const pageCount = query.data?.pages.length ?? 0;
  const products = useMemo(() => {
    const visible =
      query.data?.pages.flatMap((page) => page.products.filter(isStorefrontVisible)) ?? [];
    // Price range, age band (and size, when search used the single array-contains)
    // cannot be expressed in the same Firestore query — finish them in memory.
    return clientFiltered ? applyClientFilters(visible, filters ?? {}, !!searchToken) : visible;
  }, [query.data, clientFiltered, filters, searchToken]);

  // In-memory filters can leave a page short or empty; keep loading pages (bounded)
  // until it fills so "load more" is never the only way to see a match.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (
      clientFiltered &&
      hasNextPage &&
      !isFetchingNextPage &&
      products.length < PRODUCTS_PAGE_SIZE &&
      pageCount < MAX_FILTER_PAGES
    ) {
      void fetchNextPage();
    }
  }, [clientFiltered, hasNextPage, isFetchingNextPage, products.length, pageCount, fetchNextPage]);

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
    queryFn: async () => {
      const product = await getProductById(id);
      // Drafts and trashed products are not reachable by a direct link either.
      return product && !product.isDraft && product.deletedAt === undefined ? product : null;
    },
    enabled: !!id,
  });
}

/**
 * Several products by id, in the given order (favorites). Shares the
 * single-product cache key, so pages visited earlier are reused. Missing and
 * inactive products are left out.
 */
export function useProductsByIds(ids: readonly string[]): {
  products: Product[];
  isLoading: boolean;
} {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => getProductById(id),
    })),
  });
  return {
    products: results.flatMap((r) => (r.data && isStorefrontVisible(r.data) ? [r.data] : [])),
    isLoading: results.some((r) => r.isLoading),
  };
}
