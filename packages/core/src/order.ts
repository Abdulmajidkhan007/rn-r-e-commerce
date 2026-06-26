import { z } from 'zod';
import { AddressSchema } from './address';
import { CartItemSchema } from './cart';
import { TimestampSchema } from './product';

export const OrderStatusSchema = z.enum([
  'pending',
  'deposit_paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** An order line item has the same shape as a cart item. */
export const OrderItemSchema = CartItemSchema;

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(OrderItemSchema),
  /** All monetary fields are UZS integer som. */
  subtotal: z.number().int().nonnegative(),
  depositAmount: z.number().int().nonnegative(),
  paidAmount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  status: OrderStatusSchema,
  shippingAddress: AddressSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Order = z.infer<typeof OrderSchema>;
