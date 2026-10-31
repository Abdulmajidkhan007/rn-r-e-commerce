import { z } from 'zod';
import { LocalizedTextSchema } from './localized';
import { ProductVariantSchema } from './variant';

/**
 * Timestamps are exposed in TS as epoch milliseconds (number) so they stay
 * cross-platform and redux-persist-serializable. In Firestore they are stored
 * as native Timestamps; the @kidswear/firebase converter maps Timestamp ->
 * toMillis() on read and writes serverTimestamp().
 */
export const TimestampSchema = z.number().int().nonnegative();

export const GENDERS = ['boys', 'girls', 'unisex'] as const;
export const GenderSchema = z.enum(GENDERS);
export type Gender = z.infer<typeof GenderSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  /** Price in UZS, stored as an integer number of som. */
  price: z.number().int().nonnegative(),
  /** Optional original price for showing discounts, UZS integer som. */
  compareAtPrice: z.number().int().nonnegative().optional(),
  categoryId: z.string(),
  images: z.array(z.string()),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  /**
   * Product-level stock. For a product with `variants` it is their sum,
   * recomputed by the admin mutations — kept so catalog badges and low-stock
   * reports need no per-variant read.
   */
  stock: z.number().int().nonnegative(),
  /**
   * Per size × colour stock/price. Absent on products written before variants:
   * `productVariants()` then yields one default variant from `stock`/`price`.
   */
  variants: z.array(ProductVariantSchema).optional(),
  /** Ids of size × colour combinations the admin removed from the matrix. */
  variantsExcluded: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  isActive: z.boolean(),
  /**
   * Draft: still being prepared, never shown in the storefront. Absent on
   * older products (= not a draft). The admin writes keep `isActive` false
   * while a product is a draft, so the storefront's `isActive == true` query
   * stays the single visibility filter.
   */
  isDraft: z.boolean().optional(),
  /**
   * Epoch ms of the soft delete ("O'chirilganlar"). Absent = not deleted.
   * Trashed products are also `isActive: false`; restoring clears this field.
   */
  deletedAt: TimestampSchema.optional(),
  /**
   * Denormalized word prefixes across all localized names, maintained by the
   * admin mutations (`buildSearchTokens`). Optional because products written
   * before server-side search have none — run scripts/backfill-search-tokens.ts.
   */
  searchTokens: z.array(z.string()).optional(),
  /**
   * Who the product is for. Optional: older products have none and are left
   * out when a gender filter is active (unknown is not "unisex").
   */
  gender: GenderSchema.optional(),
  /** Age range the product fits, in months, inclusive. Optional like `gender`. */
  ageFromMonths: z.number().int().nonnegative().optional(),
  ageToMonths: z.number().int().nonnegative().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Product = z.infer<typeof ProductSchema>;
