import type { Product } from './product';

/** Trashed products older than this are offered for purging (admin does it by hand). */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type VisibilityFields = Pick<Product, 'isActive' | 'isDraft' | 'deletedAt'>;

/** True when the product is in "O'chirilganlar". */
export function isTrashed(product: Pick<Product, 'deletedAt'>): boolean {
  return product.deletedAt !== undefined;
}

/** The storefront shows only active, non-draft, non-deleted products. */
export function isStorefrontVisible(product: VisibilityFields): boolean {
  return product.isActive && !product.isDraft && !isTrashed(product);
}

/** A trashed product that has been in the trash for the full retention period. */
export function isPurgeable(product: Pick<Product, 'deletedAt'>, now: number): boolean {
  return (
    product.deletedAt !== undefined && now - product.deletedAt >= TRASH_RETENTION_DAYS * DAY_MS
  );
}

/** Days left before a trashed product becomes purgeable (0 when already due). */
export function trashDaysLeft(product: Pick<Product, 'deletedAt'>, now: number): number {
  if (product.deletedAt === undefined) return TRASH_RETENTION_DAYS;
  const left = TRASH_RETENTION_DAYS - Math.floor((now - product.deletedAt) / DAY_MS);
  return Math.max(0, left);
}

export function hasNoImages(product: Pick<Product, 'images'>): boolean {
  return product.images.length === 0;
}

/**
 * Drafts and trashed products must never be active; applied to every admin
 * write so a stale form or a bulk action cannot publish them by accident.
 */
export function enforceHiddenInvariant<T extends { isActive?: boolean; isDraft?: boolean }>(
  patch: T,
  current: { isDraft?: boolean | undefined; deletedAt?: number | undefined } | null,
): T {
  const draft = patch.isDraft ?? current?.isDraft ?? false;
  const trashed = current?.deletedAt !== undefined;
  if ((draft || trashed) && patch.isActive !== undefined) return { ...patch, isActive: false };
  return patch;
}
