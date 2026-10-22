import { describe, expect, it } from 'vitest';
import {
  StockMoveSchema,
  applyVariantDeltas,
  inventoryDelta,
  manualStockDelta,
  orderLinesStockChange,
  stockActionFor,
} from './inventory';
import { freeDeliveryRemaining, minOrderShortfall, type DeliverySettings } from './delivery';
import { DEFAULT_VARIANT_ID, variantIdFor, type VariantSource } from './variant';

const S_RED = variantIdFor('S', 'Red');
const M_RED = variantIdFor('M', 'Red');

const withVariants: VariantSource = {
  price: 100_000,
  stock: 5,
  sizes: ['S', 'M'],
  colors: ['Red'],
  variants: [
    { id: S_RED, size: 'S', color: 'Red', stock: 2 },
    { id: M_RED, size: 'M', color: 'Red', stock: 3, price: 120_000 },
  ],
};

const legacy: VariantSource = { price: 100_000, stock: 4, sizes: ['98', '104'], colors: ['Kok'] };

describe('stockActionFor — idempotent status transitions', () => {
  it('takes stock once when an order is first confirmed', () => {
    expect(stockActionFor('deposit_paid', 'processing', false)).toBe('apply');
    expect(stockActionFor('pending', 'shipped', false)).toBe('apply');
  });

  it('does nothing when stock is already taken (second click, processing → shipped)', () => {
    expect(stockActionFor('deposit_paid', 'processing', true)).toBe('none');
    expect(stockActionFor('processing', 'shipped', true)).toBe('none');
    expect(stockActionFor('shipped', 'delivered', true)).toBe('none');
  });

  it('never moves stock when the status is re-saved unchanged', () => {
    // Blaze: onOrderCreate took the stock while the order is still deposit_paid.
    expect(stockActionFor('deposit_paid', 'deposit_paid', true)).toBe('none');
    expect(stockActionFor('processing', 'processing', false)).toBe('none');
  });

  it('returns stock when a confirmed order is cancelled or moved back', () => {
    expect(stockActionFor('processing', 'cancelled', true)).toBe('return');
    expect(stockActionFor('delivered', 'cancelled', true)).toBe('return');
    expect(stockActionFor('processing', 'deposit_paid', true)).toBe('return');
    // Blaze: stock taken at creation, the admin cancels before confirming.
    expect(stockActionFor('deposit_paid', 'cancelled', true)).toBe('return');
  });

  it('does nothing for an unconfirmed order that is cancelled', () => {
    expect(stockActionFor('pending', 'cancelled', false)).toBe('none');
    expect(stockActionFor('deposit_paid', 'pending', false)).toBe('none');
  });

  it('a cancelled-then-reconfirmed order takes stock again', () => {
    expect(stockActionFor('cancelled', 'processing', false)).toBe('apply');
  });
});

describe('orderLinesStockChange', () => {
  it('decrements the ordered variants and keeps stock as their sum', () => {
    const r = orderLinesStockChange(
      withVariants,
      [{ variantId: M_RED, size: 'M', color: 'Red', quantity: 2 }],
      'sale',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.stock).toBe(3);
    expect(r.patch.variants?.find((v) => v.id === M_RED)?.stock).toBe(1);
    expect(r.patch.variants?.find((v) => v.id === M_RED)?.price).toBe(120_000);
    expect(r.deltas).toEqual([{ variantId: M_RED, delta: -2 }]);
  });

  it('resolves legacy cart lines (no variantId) by size/colour', () => {
    const r = orderLinesStockChange(
      withVariants,
      [{ size: 'S', color: 'Red', quantity: 1 }],
      'sale',
    );
    expect(r.ok && r.deltas).toEqual([{ variantId: S_RED, delta: -1 }]);
  });

  it('fails without changes when a variant runs short — lines are summed', () => {
    const r = orderLinesStockChange(
      withVariants,
      [
        { variantId: S_RED, size: 'S', color: 'Red', quantity: 1 },
        { size: 'S', color: 'Red', quantity: 2 },
      ],
      'sale',
    );
    expect(r).toEqual({ ok: false, error: 'insufficient', variantId: S_RED });
    // The input product is never mutated.
    expect(withVariants.variants?.[0]?.stock).toBe(2);
  });

  it('fails a sale for an unknown variant', () => {
    const r = orderLinesStockChange(
      withVariants,
      [{ variantId: 'gone', size: 'XL', color: 'Red', quantity: 1 }],
      'sale',
    );
    expect(r).toEqual({ ok: false, error: 'missingVariant', variantId: 'gone' });
  });

  it('a return puts units back and skips a removed variant', () => {
    const r = orderLinesStockChange(
      withVariants,
      [
        { variantId: S_RED, size: 'S', color: 'Red', quantity: 2 },
        { variantId: 'gone', size: 'XL', color: 'Red', quantity: 5 },
      ],
      'return',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.stock).toBe(7);
    expect(r.deltas).toEqual([{ variantId: S_RED, delta: 2 }]);
  });

  it('sale then return restores the original stock', () => {
    const lines = [{ variantId: M_RED, size: 'M', color: 'Red', quantity: 3 }];
    const sold = orderLinesStockChange(withVariants, lines, 'sale');
    if (!sold.ok) throw new Error('sale failed');
    const back = orderLinesStockChange({ ...withVariants, ...sold.patch }, lines, 'return');
    expect(back.ok && back.patch).toEqual({ stock: 5, variants: withVariants.variants });
  });
});

describe('legacy products (no variants)', () => {
  it('sell every size from the shared stock and write only `stock`', () => {
    const r = orderLinesStockChange(
      legacy,
      [
        { size: '98', color: 'Kok', quantity: 1 },
        { size: '104', color: 'Kok', quantity: 2 },
      ],
      'sale',
    );
    expect(r).toEqual({
      ok: true,
      patch: { stock: 1 },
      deltas: [{ variantId: DEFAULT_VARIANT_ID, delta: -3 }],
    });
  });

  it('refuse to oversell the shared stock', () => {
    const r = orderLinesStockChange(legacy, [{ size: '98', color: 'Kok', quantity: 5 }], 'sale');
    expect(r.ok).toBe(false);
  });

  it('take manual moves on the default variant', () => {
    expect(applyVariantDeltas(legacy, [{ variantId: DEFAULT_VARIANT_ID, delta: 6 }])).toEqual({
      ok: true,
      patch: { stock: 10 },
      deltas: [{ variantId: DEFAULT_VARIANT_ID, delta: 6 }],
    });
  });
});

describe('manual warehouse moves', () => {
  it('intake adds, writeoff subtracts, inventory sets the counted total', () => {
    expect(manualStockDelta(withVariants, S_RED, 'intake', 4)).toBe(4);
    expect(manualStockDelta(withVariants, S_RED, 'writeoff', 1)).toBe(-1);
    expect(manualStockDelta(withVariants, S_RED, 'inventory', 0)).toBe(-2);
    expect(inventoryDelta(withVariants, M_RED, 5)).toBe(2);
    expect(inventoryDelta(withVariants, 'nope', 5)).toBeNull();
  });

  it('a writeoff larger than the stock is refused', () => {
    const r = applyVariantDeltas(withVariants, [{ variantId: S_RED, delta: -3 }]);
    expect(r).toEqual({ ok: false, error: 'insufficient', variantId: S_RED });
  });

  it('a zero inventory difference produces no journal row', () => {
    const r = applyVariantDeltas(withVariants, [{ variantId: S_RED, delta: 0 }]);
    expect(r.ok && r.deltas).toEqual([]);
  });
});

describe('StockMoveSchema', () => {
  it('accepts a journal row and rejects an unknown reason', () => {
    const row = {
      id: 'm1',
      productId: 'p1',
      variantId: S_RED,
      delta: -1,
      reason: 'sale',
      orderId: 'o1',
      by: 'admin',
      createdAt: 1,
    };
    expect(StockMoveSchema.safeParse(row).success).toBe(true);
    expect(StockMoveSchema.safeParse({ ...row, reason: 'gift' }).success).toBe(false);
  });
});

describe('cart thresholds', () => {
  const settings: DeliverySettings = {
    defaultFee: 30_000,
    regions: {},
    freeFrom: 300_000,
    minOrder: 50_000,
  };

  it('free delivery remaining', () => {
    expect(freeDeliveryRemaining(settings, 200_000)).toBe(100_000);
    expect(freeDeliveryRemaining(settings, 400_000)).toBe(0);
    expect(freeDeliveryRemaining({ ...settings, freeFrom: 0 }, 1)).toBeNull();
    expect(freeDeliveryRemaining(null, 1)).toBeNull();
  });

  it('minimum order shortfall', () => {
    expect(minOrderShortfall(settings, 30_000)).toBe(20_000);
    expect(minOrderShortfall(settings, 50_000)).toBe(0);
    expect(minOrderShortfall({ ...settings, minOrder: undefined }, 1)).toBe(0);
    expect(minOrderShortfall(null, 1)).toBe(0);
  });
});
