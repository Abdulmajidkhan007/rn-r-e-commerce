import {
  type WithFieldValue,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  totalVariantStock,
  type Category,
  type Product,
  type ProductVariant,
} from '@kidswear/core';
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

/**
 * A product with variants stores their sum as `stock`, so catalog badges and
 * low-stock reports keep reading one field. Applied on every write that carries
 * `variants` — a client cannot send a stock that disagrees with them.
 */
function withDerivedStock<T extends Partial<ProductInput>>(input: T): T {
  if (!input.variants || input.variants.length === 0) return input;
  // Firestore rejects nested `undefined` (the converter only strips top-level
  // keys, and updateDoc bypasses it), so optional price/sku are dropped here.
  const variants: ProductVariant[] = input.variants.map(({ price, sku, ...rest }) => ({
    ...rest,
    ...(price !== undefined ? { price } : {}),
    ...(sku ? { sku } : {}),
  }));
  return { ...input, variants, stock: totalVariantStock(variants) };
}

export async function createProduct(id: string, input: ProductInput): Promise<void> {
  const value: WithFieldValue<Product> = {
    ...withDerivedStock(input),
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
    ...withDerivedStock(patch),
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
