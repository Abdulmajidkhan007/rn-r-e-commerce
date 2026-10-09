import { describe, expect, it } from 'vitest';
import type { Product } from '@kidswear/core';
import { pickDeals } from './deals';

const product = (id: string, price: number, compareAtPrice?: number): Product =>
  ({ id, price, ...(compareAtPrice !== undefined ? { compareAtPrice } : {}) }) as Product;

describe('pickDeals', () => {
  it('keeps only real discounts, biggest first, capped at count', () => {
    const items = [
      product('none', 100),
      product('small', 100, 110),
      product('big', 100, 200),
      product('equal', 100, 100),
      product('mid', 100, 150),
    ];
    expect(pickDeals(items, 2).map((p) => p.id)).toEqual(['big', 'mid']);
  });

  it('ignores free items instead of dividing by zero', () => {
    expect(pickDeals([product('free', 0, 50)], 4)).toEqual([]);
  });
});
