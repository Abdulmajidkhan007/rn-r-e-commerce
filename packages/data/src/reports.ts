import type { Order, OrderStatus } from '@kidswear/core';

/** Statuses that count as a sale: money has been received. */
const SOLD: readonly OrderStatus[] = ['deposit_paid', 'processing', 'shipped', 'delivered'];

export interface SalesBucket {
  /** 'YYYY-MM-DD' (daily) or 'YYYY-MM' (monthly), Tashkent time. */
  key: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface SalesReport {
  revenue: number;
  orders: number;
  averageOrder: number;
  discounts: number;
  deliveryFees: number;
  cancelled: number;
  /** Last `days` days, oldest first, zero-filled. */
  daily: SalesBucket[];
  /** Last 12 months, oldest first, zero-filled. */
  monthly: SalesBucket[];
  topProducts: TopProduct[];
}

/** Tashkent is UTC+5 all year (no DST) — the shop's calendar day. */
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(ms: number): string {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
}
function monthKey(ms: number): string {
  return new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 7);
}

/**
 * Pure aggregation of sales from orders — counted by order creation time.
 * Like summarizeDashboard it scans all orders in memory: fine for a small
 * shop, to be replaced by server-side counters at scale.
 */
export function summarizeSales(orders: readonly Order[], now: number, days = 30): SalesReport {
  const daily = new Map<string, SalesBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * DAY_MS);
    daily.set(key, { key, revenue: 0, orders: 0 });
  }
  const monthly = new Map<string, SalesBucket>();
  const nowLocal = new Date(now + TZ_OFFSET_MS);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    monthly.set(key, { key, revenue: 0, orders: 0 });
  }

  const products = new Map<string, TopProduct>();
  let revenue = 0;
  let count = 0;
  let discounts = 0;
  let deliveryFees = 0;
  let cancelled = 0;

  for (const order of orders) {
    if (order.status === 'cancelled') {
      cancelled++;
      continue;
    }
    if (!SOLD.includes(order.status)) continue;
    revenue += order.total;
    count++;
    discounts += order.discount ?? 0;
    deliveryFees += order.deliveryFee ?? 0;

    const d = daily.get(dayKey(order.createdAt));
    if (d) {
      d.revenue += order.total;
      d.orders++;
    }
    const m = monthly.get(monthKey(order.createdAt));
    if (m) {
      m.revenue += order.total;
      m.orders++;
    }
    for (const item of order.items) {
      const p = products.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      p.quantity += item.quantity;
      p.revenue += item.price * item.quantity;
      products.set(item.productId, p);
    }
  }

  return {
    revenue,
    orders: count,
    averageOrder: count > 0 ? Math.round(revenue / count) : 0,
    discounts,
    deliveryFees,
    cancelled,
    daily: [...daily.values()],
    monthly: [...monthly.values()],
    topProducts: [...products.values()]
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 10),
  };
}
