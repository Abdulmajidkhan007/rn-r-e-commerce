import {
  type Query,
  type QueryConstraint,
  type Unsubscribe,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { Product } from '@kidswear/core';
import { productDoc, productsCol } from './collections';

export interface ProductFilters {
  categoryId?: string;
  /** Defaults to showing all; pass `true` to restrict to active products. */
  isActive?: boolean;
}

function buildProductsQuery(filters: ProductFilters = {}): Query<Product> {
  const constraints: QueryConstraint[] = [];
  if (filters.categoryId !== undefined) {
    constraints.push(where('categoryId', '==', filters.categoryId));
  }
  if (filters.isActive !== undefined) {
    constraints.push(where('isActive', '==', filters.isActive));
  }
  constraints.push(orderBy('createdAt', 'desc'));
  return query(productsCol(), ...constraints);
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
