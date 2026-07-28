import {
  type WithFieldValue,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Category, Product } from '@kidswear/core';
import { buildSearchTokens } from '@kidswear/utils';
import { categoriesCol, categoryDoc, productDoc, productsCol } from './collections';
import type { CategoryInput, ProductInput } from './types';

/**
 * Admin write operations. Firestore rules already restrict products/categories
 * writes to admins; these functions assume an authenticated admin caller.
 */

/** Pre-generates a product id so image storage paths can use it before the write. */
export function newProductId(): string {
  return doc(productsCol()).id;
}

/** Pre-generates a category id (same rationale as products). */
export function newCategoryId(): string {
  return doc(categoriesCol()).id;
}

export async function createProduct(id: string, input: ProductInput): Promise<void> {
  const value: WithFieldValue<Product> = {
    ...input,
    id,
    // Denormalized so catalog search is a single indexed lookup rather than a
    // full-collection scan — Firestore has no substring operator.
    searchTokens: buildSearchTokens(input.name, input.description),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(productDoc(id), value);
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  // Names drive the tokens, so any edit touching them has to rebuild the array;
  // a stale one would silently make the product unfindable. The patch may be
  // partial, so re-read whatever it does not carry.
  const touchesText = patch.name !== undefined || patch.description !== undefined;
  let tokens: string[] | undefined;

  if (touchesText) {
    const current = (await getDoc(productDoc(id))).data();
    tokens = buildSearchTokens(
      patch.name ?? current?.name,
      patch.description ?? current?.description,
    );
  }

  await updateDoc(productDoc(id), {
    ...patch,
    ...(tokens ? { searchTokens: tokens } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(productDoc(id));
}

export async function createCategory(id: string, input: CategoryInput): Promise<void> {
  const value: WithFieldValue<Category> = { ...input, id };
  await setDoc(categoryDoc(id), value);
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
  await updateDoc(categoryDoc(id), { ...patch });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(categoryDoc(id));
}
