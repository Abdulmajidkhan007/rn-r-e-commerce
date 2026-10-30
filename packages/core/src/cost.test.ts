import { describe, expect, it } from 'vitest';
import {
  OrderCostSchema,
  ProductCostSchema,
  buildOrderCostLines,
  normalizeProductCost,
  unitCostFor,
  type ProductCostInput,
} from './cost';
import type { OrderItem } from './order';

const line = (productId: string, quantity: number, over: Partial<OrderItem> = {}): OrderItem => ({
  productId,
  name: productId,
  image: '',
  price: 100_000,
  quantity,
  size: 'M',
  color: 'red',
  ...over,
});

describe('unitCostFor', () => {
  const cost: ProductCostInput = { cost: 50_000, variants: { 'M|red': 45_000 } };

  it('prefers the variant value, then the product default', () => {
    expect(unitCostFor(cost, 'M|red')).toBe(45_000);
    expect(unitCostFor(cost, 'L|red')).toBe(50_000);
  });

  it('is null when nothing applies — never a silent 0', () => {
    expect(unitCostFor(null, 'M|red')).toBeNull();
    expect(unitCostFor({ variants: { 'M|red': 1 } }, 'L|red')).toBeNull();
  });

  it('keeps an explicit 0 cost', () => {
    expect(unitCostFor({ cost: 0, variants: {} }, 'x')).toBe(0);
  });
});

describe('normalizeProductCost', () => {
  it('drops blanks, invalid values, stale ids and values equal to the default', () => {
    expect(
      normalizeProductCost(
        { cost: 50_000, variants: { a: 40_000, b: undefined, c: -1, d: 1.5, e: 50_000, gone: 1 } },
        ['a', 'b', 'c', 'd', 'e'],
      ),
    ).toEqual({ cost: 50_000, variants: { a: 40_000 } });
  });

  it('omits an invalid default', () => {
    expect(normalizeProductCost({ cost: Number.NaN, variants: { a: 1 } }, ['a'])).toEqual({
      variants: { a: 1 },
    });
  });
});

describe('buildOrderCostLines', () => {
  const costs = new Map<string, ProductCostInput | null>([
    ['p1', { cost: 60_000, variants: { 'S|blue': 70_000 } }],
    ['p2', null],
  ]);

  it('snapshots cost per line and totals only the costed ones', () => {
    const snap = buildOrderCostLines(
      [
        line('p1', 2, { variantId: 'M|red' }),
        line('p1', 1, { variantId: 'S|blue' }),
        line('p2', 3),
      ],
      costs,
    );
    expect(snap.totalCost).toBe(2 * 60_000 + 70_000);
    expect(snap.missingLines).toBe(1);
    expect(snap.lines[2]).toEqual({
      productId: 'p2',
      variantId: 'default',
      quantity: 3,
      price: 100_000,
      unitCost: null,
    });
  });

  it('resolves legacy lines through the given resolver', () => {
    const snap = buildOrderCostLines([line('p1', 1)], costs, () => 'S|blue');
    expect(snap.lines[0]?.variantId).toBe('S|blue');
    expect(snap.totalCost).toBe(70_000);
  });

  it('produces a document the schema accepts', () => {
    const snap = buildOrderCostLines([line('p1', 1)], costs);
    expect(() =>
      OrderCostSchema.parse({ ...snap, id: 'o1', by: 'admin', createdAt: 1 }),
    ).not.toThrow();
    expect(ProductCostSchema.parse({ id: 'p1' }).variants).toEqual({});
  });
});
