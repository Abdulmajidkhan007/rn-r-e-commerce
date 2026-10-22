import { useEffect, useMemo, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Review, ReviewFormValues, ReviewStatus } from '@kidswear/core';
import {
  ReviewError,
  editOwnReview,
  getAdminReviews,
  getFeaturedReviews,
  getProductReviewsPage,
  moderateReview,
  recomputeAllRatings,
  submitReview,
  subscribeOrderReviews,
  type ReviewModeration,
  type ReviewPage,
  type SubmitReviewInput,
} from '@kidswear/firebase';

export const reviewKeys = {
  all: ['reviews'] as const,
  product: (productId: string) => ['reviews', 'product', productId] as const,
  featured: ['reviews', 'featured'] as const,
  admin: (status: ReviewStatus | 'all') => ['reviews', 'admin', status] as const,
};

/** Maps a review failure to an i18n key. */
export function reviewErrorKey(error: unknown): string {
  if (error instanceof ReviewError) return error.message;
  return 'reviews.errors.generic';
}

export interface UseProductReviewsResult {
  reviews: Review[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

/** Visible reviews of a product, paged ("show more"). */
export function useProductReviews(productId: string): UseProductReviewsResult {
  const query = useInfiniteQuery<ReviewPage>({
    queryKey: reviewKeys.product(productId),
    enabled: productId !== '',
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getProductReviewsPage(productId, (pageParam as ReviewPage['cursor']) ?? undefined),
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });
  const reviews = useMemo(
    () => query.data?.pages.flatMap((page) => page.reviews) ?? [],
    [query.data],
  );
  return {
    reviews,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
  };
}

/** "Mijozlar fikri" on the home screen. */
export function useFeaturedReviews(): UseQueryResult<Review[]> {
  return useQuery({ queryKey: reviewKeys.featured, queryFn: () => getFeaturedReviews() });
}

export interface OrderReviewsState {
  /** Keyed by product id. */
  byProduct: ReadonlyMap<string, Review>;
  loading: boolean;
}

/** The owner's reviews for an order, live, so the buttons flip right after a write. */
export function useOrderReviews(
  orderId: string | undefined,
  uid: string | undefined,
): OrderReviewsState {
  const key = orderId && uid ? `${orderId}:${uid}` : null;
  const [snapshot, setSnapshot] = useState<{ key: string; reviews: Review[] } | null>(null);

  useEffect(() => {
    if (!key || !orderId || !uid) return;
    return subscribeOrderReviews(
      orderId,
      uid,
      (reviews) => setSnapshot({ key, reviews }),
      () => setSnapshot({ key, reviews: [] }),
    );
  }, [key, orderId, uid]);

  const reviews = snapshot?.key === key ? snapshot.reviews : null;
  const byProduct = useMemo(
    () => new Map((reviews ?? []).map((r) => [r.productId, r] as const)),
    [reviews],
  );
  return { byProduct, loading: key !== null && reviews === null };
}

function invalidateReviews(qc: QueryClient): Promise<void> {
  return qc.invalidateQueries({ queryKey: reviewKeys.all });
}

export function useSubmitReview(): UseMutationResult<string, Error, SubmitReviewInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitReview,
    onSuccess: () => invalidateReviews(qc),
  });
}

export interface EditReviewVars {
  review: Pick<Review, 'id' | 'createdAt'>;
  values: ReviewFormValues;
}

export function useEditReview(): UseMutationResult<void, Error, EditReviewVars> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ review, values }: EditReviewVars) => editOwnReview(review, values),
    onSuccess: () => invalidateReviews(qc),
  });
}

export function useAdminReviews(status: ReviewStatus | 'all'): UseQueryResult<Review[]> {
  return useQuery({
    queryKey: reviewKeys.admin(status),
    queryFn: () => getAdminReviews(status === 'all' ? undefined : status),
  });
}

/** Moderation also rewrites product ratings, so the catalog caches go too. */
function invalidateAfterModeration(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    invalidateReviews(qc),
    // Catalog pages and the admin list both live under ['products'].
    qc.invalidateQueries({ queryKey: ['products'] }),
    qc.invalidateQueries({ queryKey: ['product'] }),
  ]);
}

export function useModerateReview(): UseMutationResult<void, Error, ReviewModeration> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: moderateReview,
    onSuccess: () => invalidateAfterModeration(qc),
  });
}

export function useRecomputeRatings(): UseMutationResult<number, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recomputeAllRatings(),
    onSuccess: () => invalidateAfterModeration(qc),
  });
}
