import { describe, expect, it } from 'vitest';
import {
  REVIEW_EDIT_WINDOW_MS,
  REVIEW_TEXT_MAX,
  REVIEWABLE_LINES_MAX,
  ReviewFormSchema,
  ReviewSchema,
  authorDisplayName,
  canEditReview,
  reviewId,
  reviewableProductIds,
  sortReviews,
  summarizeReviews,
  summarizeReviewsByProduct,
  type Review,
} from './review';
import type { OrderItem } from './order';

const line = (productId: string): OrderItem => ({
  productId,
  name: productId,
  image: '',
  price: 1000,
  quantity: 1,
  size: '98',
  color: 'oq',
});

const review: Review = {
  id: 'o1_p1',
  productId: 'p1',
  userId: 'u1',
  orderId: 'o1',
  authorName: 'Ali V.',
  rating: 5,
  text: 'Zo‘r',
  status: 'visible',
  createdAt: 1_000,
  updatedAt: 1_000,
};

describe('ReviewSchema', () => {
  it('accepts a valid review', () => {
    expect(ReviewSchema.safeParse(review).success).toBe(true);
  });

  it.each([0, 6, 4.5])('rejects rating %s', (rating) => {
    expect(ReviewSchema.safeParse({ ...review, rating }).success).toBe(false);
  });

  it('caps the text', () => {
    expect(
      ReviewSchema.safeParse({ ...review, text: 'a'.repeat(REVIEW_TEXT_MAX + 1) }).success,
    ).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(ReviewSchema.safeParse({ ...review, status: 'deleted' }).success).toBe(false);
  });
});

describe('ReviewFormSchema', () => {
  it('trims the text and allows stars only', () => {
    expect(ReviewFormSchema.parse({ rating: 4, text: '  ' })).toEqual({ rating: 4, text: '' });
  });

  it('requires a rating', () => {
    expect(ReviewFormSchema.safeParse({ rating: 0, text: 'x' }).success).toBe(false);
  });
});

describe('review helpers', () => {
  it('builds the deterministic id', () => {
    expect(reviewId('o1', 'p1')).toBe('o1_p1');
  });

  it('shortens the author name', () => {
    expect(authorDisplayName('Ali Valiyev', 'Mijoz')).toBe('Ali V.');
    expect(authorDisplayName('  Ali  ', 'Mijoz')).toBe('Ali');
    expect(authorDisplayName('   ', 'Mijoz')).toBe('Mijoz');
  });

  it('lists reviewable products only for delivered orders', () => {
    const items = [line('p1'), line('p2'), line('p1')];
    expect(reviewableProductIds({ status: 'delivered', items })).toEqual(['p1', 'p2']);
    expect(reviewableProductIds({ status: 'shipped', items })).toEqual([]);
  });

  it('stops at the line limit the rules check', () => {
    const items = Array.from({ length: REVIEWABLE_LINES_MAX + 2 }, (_, i) => line(`p${i}`));
    const ids = reviewableProductIds({ status: 'delivered', items });
    expect(ids).toHaveLength(REVIEWABLE_LINES_MAX);
    expect(ids).not.toContain(`p${REVIEWABLE_LINES_MAX}`);
  });

  it('allows edits inside the window only', () => {
    expect(canEditReview(review, review.createdAt + REVIEW_EDIT_WINDOW_MS - 1)).toBe(true);
    expect(canEditReview(review, review.createdAt + REVIEW_EDIT_WINDOW_MS)).toBe(false);
  });

  it('sorts newest first', () => {
    const sorted = sortReviews([review, { ...review, id: 'b', createdAt: 2_000 }]);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'o1_p1']);
  });
});

describe('summarizeReviews', () => {
  it('averages visible reviews to one decimal', () => {
    expect(
      summarizeReviews([
        { rating: 5, status: 'visible' },
        { rating: 4, status: 'visible' },
        { rating: 4, status: 'visible' },
        { rating: 1, status: 'hidden' },
      ]),
    ).toEqual({ rating: 4.3, reviewCount: 3 });
  });

  it('is zero without visible reviews', () => {
    expect(summarizeReviews([{ rating: 2, status: 'hidden' }])).toEqual({
      rating: 0,
      reviewCount: 0,
    });
  });

  it('groups by product', () => {
    const map = summarizeReviewsByProduct([
      { productId: 'a', rating: 5, status: 'visible' },
      { productId: 'b', rating: 3, status: 'visible' },
      { productId: 'a', rating: 4, status: 'visible' },
    ]);
    expect(map.get('a')).toEqual({ rating: 4.5, reviewCount: 2 });
    expect(map.get('b')).toEqual({ rating: 3, reviewCount: 1 });
  });
});
