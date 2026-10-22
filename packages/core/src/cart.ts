import { z } from 'zod';

export const CartItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  image: z.string(),
  /** Unit price in UZS, integer som. */
  price: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  size: z.string(),
  color: z.string(),
  /**
   * The product variant this line buys. Optional: carts persisted (and orders
   * placed) before variants existed have none and resolve by size/colour.
   */
  variantId: z.string().optional(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
