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
});

export type CartItem = z.infer<typeof CartItemSchema>;
