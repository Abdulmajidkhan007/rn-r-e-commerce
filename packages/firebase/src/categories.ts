import { type Unsubscribe, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Category } from '@kidswear/core';
import { categoriesCol } from './collections';

/** One-shot fetch of all categories, ordered by `order`. */
export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(query(categoriesCol(), orderBy('order', 'asc')));
  return snap.docs.map((d) => d.data());
}

/** Real-time subscription to all categories. */
export function subscribeCategories(cb: (categories: Category[]) => void): Unsubscribe {
  return onSnapshot(query(categoriesCol(), orderBy('order', 'asc')), (snap) => {
    cb(snap.docs.map((d) => d.data()));
  });
}
