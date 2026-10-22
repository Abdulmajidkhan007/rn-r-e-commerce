import {
  type DocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_REVIEWS_LIMIT,
  FEATURED_REVIEWS_LIMIT,
  REVIEWS_PAGE_SIZE,
  ReviewFormSchema,
  ReviewSchema,
  canEditReview,
  reviewId,
  reviewableProductIds,
  summarizeReviews,
  summarizeReviewsByProduct,
  type Order,
  type Review,
  type ReviewFormValues,
  type ReviewStatus,
} from '@kidswear/core';
import { getDb } from './app';
import { COLLECTIONS } from './collections';
import { createConverter } from './converters';

export type ReviewErrorCode = 'notDelivered' | 'notInOrder' | 'invalid' | 'editWindow' | 'notFound';

/** A refused review action; `message` is an i18n key. Nothing was written. */
export class ReviewError extends Error {
  readonly code: ReviewErrorCode;

  constructor(code: ReviewErrorCode) {
    super(`reviews.errors.${code}`);
    this.name = 'ReviewError';
    this.code = code;
  }
}

const reviewConverter = createConverter(ReviewSchema);

/** Raw collection for writes: the rules pin the exact key set and timestamps. */
function reviewsRaw() {
  return collection(getDb(), COLLECTIONS.reviews);
}

function reviewsCol() {
  return reviewsRaw().withConverter(reviewConverter);
}

function productRaw(productId: string) {
  return doc(getDb(), COLLECTIONS.products, productId);
}

// --- Customer -------------------------------------------------------------------

export interface SubmitReviewInput {
  order: Pick<Order, 'id' | 'status' | 'items'>;
  productId: string;
  userId: string;
  /** Already shortened with `authorDisplayName`. */
  authorName: string;
  values: ReviewFormValues;
}

/**
 * Owner: reviews one product of their delivered order. The id is
 * `{orderId}_{productId}`; a second review of the same line is refused by the
 * rules (it would be an update of someone else's fields). Starts `visible`;
 * the product's `rating`/`reviewCount` change only when an admin moderates or
 * recounts (customers never write products).
 */
export async function submitReview({
  order,
  productId,
  userId,
  authorName,
  values,
}: SubmitReviewInput): Promise<string> {
  if (order.status !== 'delivered') throw new ReviewError('notDelivered');
  if (!reviewableProductIds(order).includes(productId)) throw new ReviewError('notInOrder');
  const parsed = ReviewFormSchema.safeParse(values);
  if (!parsed.success) throw new ReviewError('invalid');

  const id = reviewId(order.id, productId);
  await setDoc(doc(reviewsRaw(), id), {
    productId,
    userId,
    orderId: order.id,
    authorName,
    rating: parsed.data.rating,
    text: parsed.data.text,
    status: 'visible',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

/** Author: changes stars/text within `REVIEW_EDIT_WINDOW_MS` of posting. */
export async function editOwnReview(
  review: Pick<Review, 'id' | 'createdAt'>,
  values: ReviewFormValues,
  now: number = Date.now(),
): Promise<void> {
  if (!canEditReview(review, now)) throw new ReviewError('editWindow');
  const parsed = ReviewFormSchema.safeParse(values);
  if (!parsed.success) throw new ReviewError('invalid');
  await updateDoc(doc(reviewsRaw(), review.id), {
    rating: parsed.data.rating,
    text: parsed.data.text,
    updatedAt: serverTimestamp(),
  });
}

/**
 * The owner's reviews for one order, live. Filtered by `userId` so the rules
 * can prove every result is readable (hidden reviews included).
 */
export function subscribeOrderReviews(
  orderId: string,
  userId: string,
  cb: (reviews: Review[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(reviewsCol(), where('orderId', '==', orderId), where('userId', '==', userId)),
    (snap) => cb(snap.docs.map((d) => d.data())),
    (error) => onError?.(error),
  );
}

// --- Public ---------------------------------------------------------------------

export interface ReviewPage {
  reviews: Review[];
  /** Pass back to fetch the next page; null when this was the last one. */
  cursor: DocumentSnapshot | null;
}

/** Visible reviews of a product, newest first, one page at a time. */
export async function getProductReviewsPage(
  productId: string,
  cursor?: DocumentSnapshot,
  pageSize: number = REVIEWS_PAGE_SIZE,
): Promise<ReviewPage> {
  const constraints: QueryConstraint[] = [
    where('productId', '==', productId),
    where('status', '==', 'visible'),
    orderBy('createdAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize),
  ];
  const snap = await getDocs(query(reviewsCol(), ...constraints));
  const last = snap.docs[snap.docs.length - 1] ?? null;
  return {
    reviews: snap.docs.map((d) => d.data()),
    cursor: snap.docs.length === pageSize ? last : null,
  };
}

/** "Mijozlar fikri": admin-picked visible reviews, newest first. */
export async function getFeaturedReviews(max: number = FEATURED_REVIEWS_LIMIT): Promise<Review[]> {
  const snap = await getDocs(
    query(
      reviewsCol(),
      where('featured', '==', true),
      where('status', '==', 'visible'),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((d) => d.data());
}

// --- Admin ----------------------------------------------------------------------

/** Newest reviews for moderation; hidden ones included. */
export async function getAdminReviews(status?: ReviewStatus): Promise<Review[]> {
  const constraints: QueryConstraint[] = [
    ...(status ? [where('status', '==', status)] : []),
    orderBy('createdAt', 'desc'),
    limit(ADMIN_REVIEWS_LIMIT),
  ];
  const snap = await getDocs(query(reviewsCol(), ...constraints));
  return snap.docs.map((d) => d.data());
}

export interface ReviewModeration {
  reviewId: string;
  status?: ReviewStatus;
  featured?: boolean;
  /** Admin delete instead of a field change. */
  remove?: boolean;
}

/**
 * Admin: shows/hides/features/deletes a review and, in the same transaction,
 * writes the product's `rating`/`reviewCount` from its reviews with the change
 * applied. A client transaction can't run a query, so the product's other
 * reviews are read just before it; a review posted in between is picked up by
 * the next moderation or by `recomputeAllRatings`.
 */
export async function moderateReview({
  reviewId: id,
  status,
  featured,
  remove = false,
}: ReviewModeration): Promise<void> {
  const target = await getDoc(doc(reviewsCol(), id));
  if (!target.exists()) throw new ReviewError('notFound');
  const { productId } = target.data();
  const siblings = (
    await getDocs(query(reviewsCol(), where('productId', '==', productId)))
  ).docs.map((d) => d.data());

  await runTransaction(getDb(), async (tx) => {
    const ref = doc(reviewsCol(), id);
    const snap = await tx.get(ref);
    const review = snap.exists() ? snap.data() : null;
    if (!review) throw new ReviewError('notFound');
    const productSnap = await tx.get(productRaw(productId));

    const patch = {
      ...(status ? { status } : {}),
      ...(featured !== undefined ? { featured } : {}),
    };
    const others = siblings.filter((r) => r.id !== id);
    const after = remove ? others : [...others, { ...review, ...patch }];

    if (remove) tx.delete(ref);
    else tx.update(doc(reviewsRaw(), id), { ...patch, updatedAt: serverTimestamp() });
    // A deleted product keeps its orphan reviews; there is nothing to update.
    if (productSnap.exists()) tx.update(productRaw(productId), { ...summarizeReviews(after) });
  });
}

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 450;

/**
 * Admin: recounts every product's `rating`/`reviewCount` from its visible
 * reviews (products without reviews get 0/0). Writes only products whose
 * numbers change; returns how many that was.
 */
export async function recomputeAllRatings(): Promise<number> {
  const [reviewsSnap, productsSnap] = await Promise.all([
    getDocs(reviewsCol()),
    getDocs(collection(getDb(), COLLECTIONS.products)),
  ]);
  const summaries = summarizeReviewsByProduct(reviewsSnap.docs.map((d) => d.data()));

  const changes: { id: string; rating: number; reviewCount: number }[] = [];
  for (const p of productsSnap.docs) {
    const next = summaries.get(p.id) ?? { rating: 0, reviewCount: 0 };
    const data = p.data();
    if (data['rating'] !== next.rating || data['reviewCount'] !== next.reviewCount) {
      changes.push({ id: p.id, ...next });
    }
  }

  for (let i = 0; i < changes.length; i += BATCH_LIMIT) {
    const batch = writeBatch(getDb());
    for (const { id, rating, reviewCount } of changes.slice(i, i + BATCH_LIMIT)) {
      batch.update(productRaw(id), { rating, reviewCount });
    }
    await batch.commit();
  }
  return changes.length;
}
