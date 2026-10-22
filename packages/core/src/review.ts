import { z } from 'zod';
import type { Order } from './order';
import { TimestampSchema } from './product';

// --- reviews/{orderId}_{productId} ---------------------------------------------

export const REVIEW_TEXT_MAX = 1000;
export const REVIEW_AUTHOR_MAX = 60;
/** The author may change stars/text for this long after posting (rules mirror it). */
export const REVIEW_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * The rules can't loop over `order.items`, so they check the first N lines one
 * by one. A product further down a (very long) order can't be reviewed.
 */
export const REVIEWABLE_LINES_MAX = 20;
/** "Mijozlar fikri" block on the home screen. */
export const FEATURED_REVIEWS_LIMIT = 6;
export const REVIEWS_PAGE_SIZE = 5;
/** Newest reviews loaded on the admin moderation page. */
export const ADMIN_REVIEWS_LIMIT = 200;

export const ReviewStatusSchema = z.enum(['visible', 'hidden']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const ReviewRatingSchema = z.number().int().min(1).max(5);

/**
 * A buyer's review of one product from one delivered order. The id is
 * deterministic (`reviewId`), so a second review of the same order line is an
 * update, which the rules refuse — one review per product per order.
 */
export const ReviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  userId: z.string(),
  orderId: z.string(),
  /** Shortened public name ("Ali V."), written by the client at creation. */
  authorName: z.string().min(1).max(REVIEW_AUTHOR_MAX),
  rating: ReviewRatingSchema,
  text: z.string().max(REVIEW_TEXT_MAX),
  status: ReviewStatusSchema,
  /** Admin-picked for the home page "Mijozlar fikri" block. */
  featured: z.boolean().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Review = z.infer<typeof ReviewSchema>;

/** The customer-facing form. */
export const ReviewFormSchema = z.object({
  rating: ReviewRatingSchema,
  text: z.string().trim().max(REVIEW_TEXT_MAX),
});
export type ReviewFormValues = z.infer<typeof ReviewFormSchema>;

export function reviewId(orderId: string, productId: string): string {
  return `${orderId}_${productId}`;
}

/** "Ali Valiyev" → "Ali V."; blank names fall back to the given label. */
export function authorDisplayName(displayName: string, fallback: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const [first, second] = parts;
  if (!first) return fallback.slice(0, REVIEW_AUTHOR_MAX);
  const name = second ? `${first} ${second.charAt(0).toUpperCase()}.` : first;
  return name.slice(0, REVIEW_AUTHOR_MAX);
}

/**
 * Product ids the owner may review from this order (unique, first
 * `REVIEWABLE_LINES_MAX` lines), or [] unless the order is delivered.
 * Mirrors the reviews create rule.
 */
export function reviewableProductIds(order: Pick<Order, 'status' | 'items'>): string[] {
  if (order.status !== 'delivered') return [];
  return [...new Set(order.items.slice(0, REVIEWABLE_LINES_MAX).map((i) => i.productId))];
}

/** Whether the author may still edit (the rules compare against `request.time`). */
export function canEditReview(review: Pick<Review, 'createdAt'>, now: number): boolean {
  return now < review.createdAt + REVIEW_EDIT_WINDOW_MS;
}

export interface RatingSummary {
  /** Mean of the visible reviews' stars, one decimal; 0 when there are none. */
  rating: number;
  reviewCount: number;
}

/** The `rating`/`reviewCount` a product should carry, from its reviews. */
export function summarizeReviews(
  reviews: readonly Pick<Review, 'rating' | 'status'>[],
): RatingSummary {
  const visible = reviews.filter((r) => r.status === 'visible');
  if (visible.length === 0) return { rating: 0, reviewCount: 0 };
  const sum = visible.reduce((acc, r) => acc + r.rating, 0);
  return { rating: Math.round((sum / visible.length) * 10) / 10, reviewCount: visible.length };
}

/** Per product id, for a full recount; products without reviews are not in the map. */
export function summarizeReviewsByProduct(
  reviews: readonly Pick<Review, 'productId' | 'rating' | 'status'>[],
): Map<string, RatingSummary> {
  const grouped = new Map<string, Pick<Review, 'rating' | 'status'>[]>();
  for (const r of reviews) {
    const list = grouped.get(r.productId) ?? [];
    list.push(r);
    grouped.set(r.productId, list);
  }
  return new Map([...grouped].map(([id, list]) => [id, summarizeReviews(list)]));
}

/** Newest first. */
export function sortReviews<T extends Pick<Review, 'createdAt'>>(reviews: readonly T[]): T[] {
  return [...reviews].sort((a, b) => b.createdAt - a.createdAt);
}
