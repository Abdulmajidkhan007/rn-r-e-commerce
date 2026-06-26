import type { Category, Order, Product, UserProfile } from '@kidswear/core';

/**
 * Write-input types are derived from the core domain types — never redefined.
 * Server-managed fields (`id`, `createdAt`, `updatedAt`) are omitted; the
 * converter / data-access layer supplies them.
 */
export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type CategoryInput = Omit<Category, 'id'>;
export type OrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;

/** A user profile is keyed by its `uid`, so that stays; only `createdAt` is managed. */
export type UserProfileInput = Omit<UserProfile, 'createdAt'>;
