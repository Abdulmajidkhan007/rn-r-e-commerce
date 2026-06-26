import { z } from 'zod';
import { LocalizedTextSchema } from './localized';

/**
 * Timestamps are stored as ISO-8601 strings so they remain JSON-serializable
 * (Redux/redux-persist friendly). A later phase may map Firestore Timestamps
 * to/from this representation.
 */
export const IsoDateSchema = z.string().datetime({ offset: true });

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
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export type Product = z.infer<typeof ProductSchema>;
