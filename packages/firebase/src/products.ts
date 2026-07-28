import {
  type DocumentSnapshot,
  type Query,
  type QueryConstraint,
  type Unsubscribe,
  getDoc,
  getDocs,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import type { Product } from '@kidswear/core';
import { productDoc, productsCol } from './collections';

export type ProductSortField = 'newest' | 'priceAsc' | 'priceDesc';

export interface ProductFilters {
  categoryId?: string;
  /** Defaults to showing all; pass `true` to restrict to active products. */
  isActive?: boolean;
  /**
   * Single normalized token matched against the denormalized `searchTokens`
   * array. Build it with `searchQueryToken` so it matches how tokens were
   * stored.
   */
  searchToken?: string;
  sort?: ProductSortField;
  /** Page size. Omit for the whole (filtered) collection. */
  limit?: number;
  /** Last document of the previous page, for keyset pagination. */
  cursor?: DocumentSnapshot<Product> | undefined;
}

const SORT_FIELD: Record<ProductSortField, [field: string, direction: 'asc' | 'desc']> = {
  newest: ['createdAt', 'desc'],
  priceAsc: ['price', 'asc'],
  priceDesc: ['price', 'desc'],
};

function buildProductsQuery(filters: ProductFilters = {}): Query<Product> {
  const constraints: QueryConstraint[] = [];
  if (filters.categoryId !== undefined) {
    constraints.push(where('categoryId', '==', filters.categoryId));
  }
  if (filters.isActive !== undefined) {
    constraints.push(where('isActive', '==', filters.isActive));
  }
  if (filters.searchToken) {
    constraints.push(where('searchTokens', 'array-contains', filters.searchToken));
  }

  const [field, direction] = SORT_FIELD[filters.sort ?? 'newest'];
  constraints.push(orderBy(field, direction));
  // Tie-break on the document id so keyset pagination cannot skip or repeat
  // rows when several products share a price.
  if (field !== 'createdAt') constraints.push(orderBy('createdAt', 'desc'));

  if (filters.cursor) constraints.push(startAfter(filters.cursor));
  if (filters.limit !== undefined) constraints.push(limitTo(filters.limit));

  return query(productsCol(), ...constraints);
}

export interface ProductPage {
  products: Product[];
  /** Pass back as `cursor` to fetch the next page; null when exhausted. */
  cursor: DocumentSnapshot<Product> | null;
}

/**
 * One page of products. Keyset pagination (`startAfter`) rather than offsets:
 * Firestore bills for documents an offset would skip, and offsets drift when
 * rows are inserted between page loads.
 */
export async function getProductPage(filters: ProductFilters = {}): Promise<ProductPage> {
  const snap = await getDocs(buildProductsQuery(filters));
  const last = snap.docs[snap.docs.length - 1] ?? null;
  const full = filters.limit !== undefined && snap.docs.length === filters.limit;
  return {
    products: snap.docs.map((d) => d.data()),
    cursor: full ? last : null,
  };
}

/** One-shot fetch of products matching the (optional) filters. */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  const snap = await getDocs(buildProductsQuery(filters));
  return snap.docs.map((d) => d.data());
}

/** Real-time subscription to products matching the (optional) filters. */
export function subscribeProducts(
  filters: ProductFilters | undefined,
  cb: (products: Product[]) => void,
): Unsubscribe {
  return onSnapshot(buildProductsQuery(filters), (snap) => {
    cb(snap.docs.map((d) => d.data()));
  });
}

/** One-shot fetch of a single product by id, or `null` if it does not exist. */
export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(productDoc(id));
  return snap.exists() ? snap.data() : null;
}

/** Real-time subscription to a single product. */
export function subscribeProduct(id: string, cb: (product: Product | null) => void): Unsubscribe {
  return onSnapshot(productDoc(id), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}
