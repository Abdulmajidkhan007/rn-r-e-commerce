import {
  type WithFieldValue,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  enforceHiddenInvariant,
  hasNoImages,
  isPurgeable,
  totalVariantStock,
  type CatalogImportProduct,
  type Category,
  type Product,
  type ProductVariant,
} from '@kidswear/core';
import { buildSearchTokens } from '@kidswear/utils';
import { categoriesCol, categoryDoc, productDoc, productsCol } from './collections';
import { getProducts } from './products';
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
    ...withDerivedStock(enforceHiddenInvariant(input, null)),
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
  // A draft or trashed product must stay inactive even when an older form
  // (e.g. the mobile one) saves `isActive: true`.
  const needsCurrent = touchesText || (patch.isActive === true && patch.isDraft === undefined);
  const current = needsCurrent ? (await getDoc(productDoc(id))).data() : undefined;

  if (touchesText) {
    tokens = buildSearchTokens(
      patch.name ?? current?.name,
      patch.description ?? current?.description,
    );
  }

  await updateDoc(productDoc(id), {
    ...withDerivedStock(enforceHiddenInvariant(patch, current ?? null)),
    ...(tokens ? { searchTokens: tokens } : {}),
    updatedAt: serverTimestamp(),
  });
}

/** Permanent delete. The admin UI uses `trashProduct`; this is for emptying the trash. */
export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(productDoc(id));
}

/** Soft delete: the product moves to "O'chirilganlar" and goes off the storefront. */
export async function trashProduct(id: string): Promise<void> {
  await updateDoc(productDoc(id), {
    deletedAt: Date.now(),
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/** Brings a trashed product back. It returns inactive — the admin switches it on. */
export async function restoreProduct(id: string): Promise<void> {
  await updateDoc(productDoc(id), { deletedAt: deleteField(), updatedAt: serverTimestamp() });
}

export type BulkProductAction =
  | { type: 'hide' }
  | { type: 'move'; categoryId: string }
  | { type: 'trash' }
  | { type: 'restore' };

/** Firestore allows 500 writes per batch. */
const BATCH_SIZE = 400;

/** Applies one action to many products in batches. Returns how many were written. */
export async function bulkUpdateProducts(
  ids: readonly string[],
  action: BulkProductAction,
): Promise<number> {
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = writeBatch(productDoc(unique[0] as string).firestore);
    for (const id of unique.slice(i, i + BATCH_SIZE)) {
      const ref = productDoc(id);
      const stamp = { updatedAt: serverTimestamp() };
      if (action.type === 'hide') batch.update(ref, { isActive: false, ...stamp });
      else if (action.type === 'move')
        batch.update(ref, { categoryId: action.categoryId, ...stamp });
      else if (action.type === 'trash') {
        batch.update(ref, { deletedAt: Date.now(), isActive: false, ...stamp });
      } else batch.update(ref, { deletedAt: deleteField(), ...stamp });
    }
    await batch.commit();
  }
  return unique.length;
}

/** Hides every active, live product that has no photo. Returns how many were hidden. */
export async function hideProductsWithoutImages(): Promise<number> {
  const products = await getProducts();
  const ids = products
    .filter((p) => p.isActive && p.deletedAt === undefined && hasNoImages(p))
    .map((p) => p.id);
  if (ids.length === 0) return 0;
  return bulkUpdateProducts(ids, { type: 'hide' });
}

/** Permanently deletes trashed products older than the retention period. */
export async function purgeExpiredProducts(now = Date.now()): Promise<number> {
  const products = await getProducts();
  const expired = products.filter((p) => isPurgeable(p, now));
  for (let i = 0; i < expired.length; i += BATCH_SIZE) {
    const batch = writeBatch(productDoc(expired[0]?.id as string).firestore);
    for (const p of expired.slice(i, i + BATCH_SIZE)) batch.delete(productDoc(p.id));
    await batch.commit();
  }
  return expired.length;
}

export interface ImportProductsResult {
  created: number;
  /** Ids that already exist: the import never overwrites a product. */
  skippedExisting: string[];
}

/** Creates the parsed CSV products (inactive, no photos). Existing ids are skipped. */
export async function importProducts(
  items: readonly CatalogImportProduct[],
): Promise<ImportProductsResult> {
  const existing = new Set(
    (
      await Promise.all(
        items.map(async (p) => ((await getDoc(productDoc(p.id))).exists() ? p.id : null)),
      )
    ).filter((id): id is string => id !== null),
  );
  const fresh = items.filter((p) => !existing.has(p.id));
  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = writeBatch(productDoc(fresh[0]?.id as string).firestore);
    for (const { id, input } of fresh.slice(i, i + BATCH_SIZE)) {
      const value: WithFieldValue<Product> = {
        ...input,
        id,
        searchTokens: buildSearchTokens(input.name, input.description),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      batch.set(productDoc(id), value);
    }
    await batch.commit();
  }
  return { created: fresh.length, skippedExisting: [...existing] };
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
