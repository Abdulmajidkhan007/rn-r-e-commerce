import {
  type WithFieldValue,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Category, Product } from '@kidswear/core';
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(productDoc(id), value);
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  await updateDoc(productDoc(id), { ...patch, updatedAt: serverTimestamp() });
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
