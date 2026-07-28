import { describe, expect, it } from 'vitest';
import type { Order, OrderStatus, Product } from '@kidswear/core';
import { LOW_STOCK_THRESHOLD, summarizeDashboard } from './dashboard';
import { makeOrder, makeProduct } from './testFixtures';

function order(status: OrderStatus, paidAmount: number, total: number): Order {
  return makeOrder({ status, paidAmount, total, subtotal: total, depositAmount: paidAmount });
}

function product(stock: number, isActive = true): Product {
  return makeProduct({ stock, isActive });
}

describe('summarizeDashboard', () => {
  it('returns a zeroed, fully-keyed summary for empty input', () => {
    const stats = summarizeDashboard([], []);
    expect(stats.totalOrders).toBe(0);
    expect(stats.totalProducts).toBe(0);
    expect(stats.depositsCollected).toBe(0);
    expect(stats.revenue).toBe(0);
    // Every status must be present so the chart renders all bars at zero
    // instead of dropping categories.
    expect(Object.values(stats.byStatus)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('counts orders per status', () => {
    const stats = summarizeDashboard(
      [
        order('pending', 0, 100),
        order('deposit_paid', 50, 100),
        order('deposit_paid', 50, 100),
        order('delivered', 100, 100),
      ],
      [],
    );
    expect(stats.byStatus.deposit_paid).toBe(2);
    expect(stats.byStatus.pending).toBe(1);
    expect(stats.byStatus.delivered).toBe(1);
    expect(stats.byStatus.shipped).toBe(0);
    expect(stats.totalOrders).toBe(4);
  });

  it('excludes cancelled orders from money, but still counts them', () => {
    const stats = summarizeDashboard(
      [order('deposit_paid', 50_000, 100_000), order('cancelled', 50_000, 100_000)],
      [],
    );
    expect(stats.depositsCollected).toBe(50_000);
    expect(stats.revenue).toBe(100_000);
    expect(stats.totalOrders).toBe(2);
    expect(stats.byStatus.cancelled).toBe(1);
  });

  it('counts low stock only among active products', () => {
    const stats = summarizeDashboard(
      [],
      [
        product(0),
        product(LOW_STOCK_THRESHOLD),
        product(LOW_STOCK_THRESHOLD + 1),
        product(1, false), // inactive: low, but not sellable — must not alarm
      ],
    );
    expect(stats.lowStock).toBe(2);
    expect(stats.totalProducts).toBe(4);
  });

  it('treats the threshold as inclusive', () => {
    expect(summarizeDashboard([], [product(LOW_STOCK_THRESHOLD)]).lowStock).toBe(1);
    expect(summarizeDashboard([], [product(LOW_STOCK_THRESHOLD + 1)]).lowStock).toBe(0);
  });

  it('does not mutate the inputs', () => {
    const orders = [order('pending', 0, 100)];
    const products = [product(3)];
    const snapshot = JSON.stringify({ orders, products });
    summarizeDashboard(orders, products);
    expect(JSON.stringify({ orders, products })).toBe(snapshot);
  });
});
