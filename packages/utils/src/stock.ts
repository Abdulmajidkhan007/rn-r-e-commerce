export type StockStatus = 'in' | 'low' | 'out';

/** Low-stock threshold (inclusive). */
export const LOW_STOCK_THRESHOLD = 5;

/** Classifies a stock count into in/low/out for badges. */
export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'in';
}
