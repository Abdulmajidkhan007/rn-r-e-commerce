import { z } from 'zod';
import { LocalizedTextSchema } from './localized';

/**
 * Timestamps are exposed in TS as epoch milliseconds (number) so they stay
 * cross-platform and redux-persist-serializable. In Firestore they are stored
 * as native Timestamps; the @kidswear/firebase converter maps Timestamp ->
 * toMillis() on read and writes serverTimestamp().
 */
export const TimestampSchema = z.number().int().nonnegative();

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
  stock: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Product = z.infer<typeof ProductSchema>;
