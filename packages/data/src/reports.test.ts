import { describe, expect, it } from 'vitest';
import { summarizeSales } from './reports';
import { makeOrder } from './testFixtures';

// 2026-10-09 12:00 Tashkent = 07:00 UTC
const NOW = Date.UTC(2026, 9, 9, 7, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const item = (productId: string, quantity: number, price = 100_000) => ({
  productId,
  name: productId,
  image: '',
  price,
  quantity,
  size: 'M',
  color: 'red',
});

describe('summarizeSales', () => {
  const orders = [
    makeOrder({
      id: 'a',
      status: 'delivered',
      total: 200_000,
      items: [item('p1', 2)],
      createdAt: NOW,
    }),
    makeOrder({
      id: 'b',
      status: 'deposit_paid',
      total: 130_000,
      discount: 10_000,
      deliveryFee: 40_000,
      items: [item('p2', 1)],
      createdAt: NOW - DAY,
    }),
    makeOrder({
      id: 'c',
      status: 'pending',
      total: 999_999,
      items: [item('p3', 9)],
      createdAt: NOW,
    }),
    makeOrder({
      id: 'd',
      status: 'cancelled',
      total: 500_000,
      items: [item('p1', 5)],
      createdAt: NOW,
    }),
  ];
  const report = summarizeSales(orders, NOW);

  it('counts only paid orders — not pending, not cancelled', () => {
    expect(report.revenue).toBe(330_000);
    expect(report.orders).toBe(2);
    expect(report.averageOrder).toBe(165_000);
    expect(report.cancelled).toBe(1);
    expect(report.discounts).toBe(10_000);
    expect(report.deliveryFees).toBe(40_000);
  });

  it('buckets by Tashkent calendar day, zero-filled, oldest first', () => {
    expect(report.daily).toHaveLength(30);
    expect(report.daily.at(-1)).toEqual({ key: '2026-10-09', revenue: 200_000, orders: 1 });
    expect(report.daily.at(-2)).toEqual({ key: '2026-10-08', revenue: 130_000, orders: 1 });
    expect(report.daily[0]?.revenue).toBe(0);
  });

  it('uses Tashkent time at the day boundary', () => {
    // 23:30 UTC on Oct 8 is already 04:30 on Oct 9 in Tashkent.
    const late = summarizeSales(
      [
        makeOrder({
          status: 'delivered',
          total: 1,
          items: [],
          createdAt: Date.UTC(2026, 9, 8, 23, 30),
        }),
      ],
      NOW,
    );
    expect(late.daily.at(-1)?.orders).toBe(1);
  });

  it('has 12 months ending with the current one', () => {
    expect(report.monthly).toHaveLength(12);
    expect(report.monthly.at(-1)?.key).toBe('2026-10');
    expect(report.monthly[0]?.key).toBe('2025-11');
  });

  it('ranks products by quantity sold', () => {
    expect(report.topProducts.map((p) => [p.productId, p.quantity])).toEqual([
      ['p1', 2],
      ['p2', 1],
    ]);
  });
});
