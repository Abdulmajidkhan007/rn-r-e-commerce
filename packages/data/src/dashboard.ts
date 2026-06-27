import type { Order, OrderStatus, Product } from '@kidswear/core';

/** Low-stock threshold (inclusive) used by the admin dashboard. */
export const LOW_STOCK_THRESHOLD = 5;

const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'deposit_paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export interface DashboardStats {
  totalProducts: number;
  /** Active products at or below the low-stock threshold. */
  lowStock: number;
  totalOrders: number;
  /** Order counts keyed by status (every status present, defaulting to 0). */
  byStatus: Record<OrderStatus, number>;
  /** Sum of paidAmount across non-cancelled orders, UZS integer som. */
  depositsCollected: number;
  /** Sum of order totals across non-cancelled orders, UZS integer som. */
  revenue: number;
}

/**
 * Pure client-side aggregation of admin stats. NOTE: this scans the full
 * product + order arrays in memory and is intended for modest catalogs; at
 * scale it should be replaced by server-side aggregation (e.g. counters or
 * a scheduled function).
 */
export function summarizeDashboard(orders: Order[], products: Product[]): DashboardStats {
  const byStatus = ORDER_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<OrderStatus, number>,
  );

  let depositsCollected = 0;
  let revenue = 0;
  for (const order of orders) {
    byStatus[order.status] += 1;
    if (order.status !== 'cancelled') {
      depositsCollected += order.paidAmount;
      revenue += order.total;
    }
  }

  const lowStock = products.filter((p) => p.isActive && p.stock <= LOW_STOCK_THRESHOLD).length;

  return {
    totalProducts: products.length,
    lowStock,
    totalOrders: orders.length,
    byStatus,
    depositsCollected,
    revenue,
  };
}
