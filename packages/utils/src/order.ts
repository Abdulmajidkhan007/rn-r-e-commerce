/** Fraction of the subtotal due up-front as a deposit. */
export const DEPOSIT_RATE = 0.5;

export interface OrderTotals {
  /** Sum of price × quantity, UZS integer som. */
  subtotal: number;
  /** Up-front deposit (DEPOSIT_RATE of subtotal), UZS integer som. */
  depositAmount: number;
  /** Order total (equals subtotal; remaining = total − depositAmount). */
  total: number;
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
export function computeOrderTotals(items: readonly PricedLine[]): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const depositAmount = Math.round(subtotal * DEPOSIT_RATE);
  return { subtotal, depositAmount, total: subtotal };
}
