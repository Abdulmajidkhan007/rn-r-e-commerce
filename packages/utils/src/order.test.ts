import { describe, expect, it } from 'vitest';
import { computeOrderTotals, DEPOSIT_RATE } from './order';

describe('computeOrderTotals', () => {
  it('sums price × quantity across lines', () => {
    const totals = computeOrderTotals([
      { price: 100_000, quantity: 2 },
      { price: 50_000, quantity: 3 },
    ]);
    expect(totals.subtotal).toBe(350_000);
  });

  it('charges DEPOSIT_RATE of the subtotal up front', () => {
    const totals = computeOrderTotals([{ price: 200_000, quantity: 1 }]);
    expect(totals.depositAmount).toBe(200_000 * DEPOSIT_RATE);
  });

  it('keeps total equal to subtotal — the deposit is a part payment, not a discount', () => {
    const totals = computeOrderTotals([{ price: 123_456, quantity: 7 }]);
    expect(totals.total).toBe(totals.subtotal);
  });

  it('rounds the deposit to whole som on an odd subtotal', () => {
    // 33_333 × 1 → half is 16_666.5, which must not reach Firestore as a float.
    const totals = computeOrderTotals([{ price: 33_333, quantity: 1 }]);
    expect(totals.depositAmount).toBe(16_667);
    expect(Number.isInteger(totals.depositAmount)).toBe(true);
  });

  it('returns zeroes for an empty cart', () => {
    expect(computeOrderTotals([])).toEqual({ subtotal: 0, depositAmount: 0, total: 0 });
  });

  it('never leaves a remainder that cannot be settled', () => {
    // Whatever the rounding, deposit + remaining must reconstruct the total.
    for (const price of [1, 7, 999, 33_333, 1_000_001]) {
      const { total, depositAmount } = computeOrderTotals([{ price, quantity: 3 }]);
      expect(depositAmount + (total - depositAmount)).toBe(total);
    }
  });
});
