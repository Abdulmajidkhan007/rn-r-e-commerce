/** Fraction of the subtotal due up-front as a deposit. */
export const DEPOSIT_RATE = 0.5;

export interface OrderTotals {
  /** Sum of price × quantity, UZS integer som. */
  subtotal: number;
  /** Promo discount actually applied (never more than the subtotal). */
  discount: number;
  /** Delivery fee. */
  deliveryFee: number;
  /** Up-front deposit (DEPOSIT_RATE of total), UZS integer som. */
  depositAmount: number;
  /** subtotal − discount + deliveryFee; remaining = total − depositAmount. */
  total: number;
}

export interface OrderAdjustments {
  discount?: number;
  deliveryFee?: number;
}

/** A line's monetary inputs (CartItem/OrderItem are compatible). */
export interface PricedLine {
  price: number;
  quantity: number;
}

/**
 * Computes order totals from cart lines. Pure and deterministic so it can be
 * unit-tested and shared by both platforms. All amounts are UZS integer som.
 */
export function computeOrderTotals(
  items: readonly PricedLine[],
  adjustments: OrderAdjustments = {},
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.min(Math.max(0, adjustments.discount ?? 0), subtotal);
  const deliveryFee = Math.max(0, adjustments.deliveryFee ?? 0);
  const total = subtotal - discount + deliveryFee;
  const depositAmount = Math.round(total * DEPOSIT_RATE);
  return { subtotal, discount, deliveryFee, depositAmount, total };
}
