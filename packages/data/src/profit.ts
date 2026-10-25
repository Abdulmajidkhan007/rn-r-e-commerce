import { STOCK_HOLDING_STATUSES, type Order, type OrderCost } from '@kidswear/core';
import { dayKey, monthKey, tashkentDayStart } from './reports';

/** Half-open period `[from, to)` in epoch ms, matched against order creation time. */
export interface ProfitPeriod {
  from: number;
  to: number;
}

export type ProfitPreset = 'thisMonth' | 'last30' | 'last12m' | 'all';

/** Inclusive Tashkent day range, as 'YYYY-MM-DD' keys (what date inputs hold). */
export interface DayRange {
  from: string;
  to: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day range a preset stands for, ending today (Tashkent). */
export function profitPresetRange(preset: ProfitPreset, now: number): DayRange {
  const to = dayKey(now);
  switch (preset) {
    case 'thisMonth':
      return { from: `${to.slice(0, 7)}-01`, to };
    case 'last30':
      return { from: dayKey(now - 29 * DAY_MS), to };
    case 'last12m': {
      const start = new Date(Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 12, 1));
      return { from: start.toISOString().slice(0, 10), to };
    }
    case 'all':
      return { from: '2000-01-01', to };
  }
}

/** Inclusive day range → half-open ms period; null when malformed or reversed. */
export function periodFromDays(range: DayRange): ProfitPeriod | null {
  const from = tashkentDayStart(range.from);
  const to = tashkentDayStart(range.to) + DAY_MS;
  return Number.isFinite(from) && Number.isFinite(to) && from < to ? { from, to } : null;
}

export interface ProfitBucket {
  /** 'YYYY-MM', Tashkent time. */
  key: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

export interface ProfitReport {
  /** Confirmed orders (goods left the shelf) created in the period. */
  confirmedOrders: number;
  /** Σ `total` of those orders, delivery included. */
  revenue: number;
  deliveryFees: number;
  /** `revenue − deliveryFees`: what the goods sold for, after discounts. */
  goodsRevenue: number;
  /** Confirmed orders with a complete cost snapshot — the only ones in profit. */
  costedOrders: number;
  /** Goods revenue of the costed orders. */
  costedRevenue: number;
  cost: number;
  /** `costedRevenue − cost`. */
  profit: number;
  /** `profit / costedRevenue`, or null when nothing is costed. */
  margin: number | null;
  /** Confirmed orders left out: no snapshot, or a line had no cost. */
  uncostedOrders: number;
  /** Per month inside the period (costed orders only), oldest first. */
  monthly: ProfitBucket[];
}

/**
 * Pure profit aggregation. An order counts once it is confirmed
 * (`STOCK_HOLDING_STATUSES`); its cost comes from the `orderCosts` snapshot
 * taken at confirmation. Orders without a full snapshot are counted in revenue
 * but kept out of cost and profit — a missing cost is never treated as 0.
 * Delivery fees are not profit on goods, so they are excluded from it.
 */
export function summarizeProfit(
  orders: readonly Order[],
  costs: ReadonlyMap<string, OrderCost>,
  period: ProfitPeriod,
): ProfitReport {
  const monthly = new Map<string, ProfitBucket>();
  const report: ProfitReport = {
    confirmedOrders: 0,
    revenue: 0,
    deliveryFees: 0,
    goodsRevenue: 0,
    costedOrders: 0,
    costedRevenue: 0,
    cost: 0,
    profit: 0,
    margin: null,
    uncostedOrders: 0,
    monthly: [],
  };

  for (const order of orders) {
    if (!STOCK_HOLDING_STATUSES.includes(order.status)) continue;
    if (order.createdAt < period.from || order.createdAt >= period.to) continue;
    const fee = order.deliveryFee ?? 0;
    const goods = order.total - fee;
    report.confirmedOrders++;
    report.revenue += order.total;
    report.deliveryFees += fee;
    report.goodsRevenue += goods;

    const snapshot = costs.get(order.id);
    if (!snapshot || snapshot.missingLines > 0) {
      report.uncostedOrders++;
      continue;
    }
    report.costedOrders++;
    report.costedRevenue += goods;
    report.cost += snapshot.totalCost;

    const key = monthKey(order.createdAt);
    const bucket = monthly.get(key) ?? { key, revenue: 0, cost: 0, profit: 0, orders: 0 };
    bucket.revenue += goods;
    bucket.cost += snapshot.totalCost;
    bucket.profit = bucket.revenue - bucket.cost;
    bucket.orders++;
    monthly.set(key, bucket);
  }

  report.profit = report.costedRevenue - report.cost;
  report.margin = report.costedRevenue > 0 ? report.profit / report.costedRevenue : null;
  report.monthly = [...monthly.values()].sort((a, b) => a.key.localeCompare(b.key));
  return report;
}

/**
 * Confirmed orders that have no cost snapshot yet — confirmed before cost
 * tracking existed (or on Blaze before an admin touched them).
 */
export function ordersMissingCost(
  orders: readonly Order[],
  costs: ReadonlyMap<string, OrderCost>,
): Order[] {
  return orders.filter((o) => STOCK_HOLDING_STATUSES.includes(o.status) && !costs.has(o.id));
}
