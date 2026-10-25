import { describe, expect, it } from 'vitest';
import type { OrderCost } from '@kidswear/core';
import { ordersMissingCost, periodFromDays, profitPresetRange, summarizeProfit } from './profit';
import { tashkentDayStart } from './reports';
import { makeOrder } from './testFixtures';

const OCT = tashkentDayStart('2026-10-01');
const NOV = tashkentDayStart('2026-11-01');
const DAY = 24 * 60 * 60 * 1000;

const snapshot = (id: string, totalCost: number, missingLines = 0): OrderCost => ({
  id,
  lines: [],
  totalCost,
  missingLines,
  by: 'admin',
  createdAt: OCT,
});

describe('summarizeProfit', () => {
  const orders = [
    // Costed, delivery fee is not profit.
    makeOrder({
      id: 'a',
      status: 'delivered',
      total: 240_000,
      deliveryFee: 40_000,
      createdAt: OCT,
    }),
    makeOrder({ id: 'b', status: 'processing', total: 100_000, createdAt: OCT + 2 * DAY }),
    // Confirmed but no snapshot / a line without cost: revenue only.
    makeOrder({ id: 'c', status: 'shipped', total: 50_000, createdAt: OCT + DAY }),
    makeOrder({ id: 'd', status: 'shipped', total: 70_000, createdAt: OCT + DAY }),
    // Not confirmed or cancelled: ignored even with a snapshot.
    makeOrder({ id: 'e', status: 'deposit_paid', total: 999_000, createdAt: OCT }),
    makeOrder({ id: 'f', status: 'cancelled', total: 999_000, createdAt: OCT }),
    // Outside the period.
    makeOrder({ id: 'g', status: 'delivered', total: 500_000, createdAt: NOV }),
  ];
  const costs = new Map<string, OrderCost>([
    ['a', snapshot('a', 120_000)],
    ['b', snapshot('b', 30_000)],
    ['d', snapshot('d', 10_000, 1)],
    ['f', snapshot('f', 1)],
    ['g', snapshot('g', 1)],
  ]);
  const report = summarizeProfit(orders, costs, { from: OCT, to: NOV });

  it('counts confirmed orders in the period only', () => {
    expect(report.confirmedOrders).toBe(4);
    expect(report.revenue).toBe(460_000);
    expect(report.deliveryFees).toBe(40_000);
    expect(report.goodsRevenue).toBe(420_000);
  });

  it('computes profit on fully costed orders, never treating missing cost as 0', () => {
    expect(report.costedOrders).toBe(2);
    expect(report.uncostedOrders).toBe(2);
    expect(report.costedRevenue).toBe(300_000);
    expect(report.cost).toBe(150_000);
    expect(report.profit).toBe(150_000);
    expect(report.margin).toBeCloseTo(0.5);
  });

  it('buckets costed orders by Tashkent month', () => {
    expect(report.monthly).toEqual([
      { key: '2026-10', revenue: 300_000, cost: 150_000, profit: 150_000, orders: 2 },
    ]);
  });

  it('has a null margin and zero profit when nothing is costed', () => {
    const empty = summarizeProfit(orders, new Map(), { from: OCT, to: NOV });
    expect(empty.margin).toBeNull();
    expect(empty.profit).toBe(0);
    expect(empty.uncostedOrders).toBe(4);
  });

  it('includes `from` and excludes `to` at the Tashkent midnight boundary', () => {
    const r = summarizeProfit(
      [makeOrder({ id: 'a', status: 'delivered', total: 1, createdAt: NOV - 1 })],
      new Map([['a', snapshot('a', 0)]]),
      { from: OCT, to: NOV },
    );
    expect(r.costedOrders).toBe(1);
    expect(summarizeProfit(orders, costs, { from: NOV, to: NOV + DAY }).confirmedOrders).toBe(1);
  });
});

describe('ordersMissingCost', () => {
  it('lists confirmed orders without any snapshot', () => {
    const orders = [
      makeOrder({ id: 'a', status: 'processing' }),
      makeOrder({ id: 'b', status: 'delivered' }),
      makeOrder({ id: 'c', status: 'pending' }),
    ];
    expect(ordersMissingCost(orders, new Map([['a', snapshot('a', 1)]])).map((o) => o.id)).toEqual([
      'b',
    ]);
  });
});

describe('tashkentDayStart', () => {
  it('is 00:00 in UTC+5 and NaN for bad input', () => {
    expect(tashkentDayStart('2026-10-01')).toBe(Date.UTC(2026, 8, 30, 19, 0));
    expect(tashkentDayStart('01.10.2026')).toBeNaN();
  });
});

describe('profit periods', () => {
  // 2026-10-25 02:00 Tashkent = 2026-10-24 21:00 UTC: the Tashkent day is used.
  const NOW = Date.UTC(2026, 9, 24, 21, 0);

  it('maps presets to inclusive Tashkent day ranges ending today', () => {
    expect(profitPresetRange('thisMonth', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-25' });
    expect(profitPresetRange('last30', NOW)).toEqual({ from: '2026-09-26', to: '2026-10-25' });
    expect(profitPresetRange('last12m', NOW)).toEqual({ from: '2025-11-01', to: '2026-10-25' });
    expect(profitPresetRange('all', NOW).from).toBe('2000-01-01');
  });

  it('turns a day range into a half-open period, rejecting bad input', () => {
    expect(periodFromDays({ from: '2026-10-01', to: '2026-10-31' })).toEqual({
      from: OCT,
      to: NOV,
    });
    expect(periodFromDays({ from: '2026-10-02', to: '2026-10-01' })).toBeNull();
    expect(periodFromDays({ from: '', to: '2026-10-01' })).toBeNull();
  });
});
