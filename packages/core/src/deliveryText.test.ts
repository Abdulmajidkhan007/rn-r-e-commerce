import { describe, expect, it } from 'vitest';
import { deliveryText, type DeliverySettings } from './delivery';

const money = (n: number): string => `${n}$`;
const base: DeliverySettings = { defaultFee: 30000, regions: {}, freeFrom: 0 };

describe('deliveryText', () => {
  it('says delivery is free when no settings exist', () => {
    expect(deliveryText(null, 'en', money)).toEqual({
      summary: 'Delivery is free',
      free: null,
      min: null,
    });
    expect(deliveryText(undefined, 'uz', money).summary).toBe('Yetkazib berish bepul');
  });

  it('says free when every fee is 0', () => {
    expect(deliveryText({ ...base, defaultFee: 0 }, 'ru', money).summary).toBe(
      'Доставка бесплатная',
    );
  });

  it('shows a flat fee, or a range across regions', () => {
    expect(deliveryText(base, 'en', money).summary).toBe('Delivery: 30000$');
    const ranged = { ...base, regions: { tashkent: 20000, samarkand: 50000 } };
    expect(deliveryText(ranged, 'en', money).summary).toBe('Delivery: 20000$ to 50000$');
  });

  it('describes the free threshold, and none when freeFrom is 0', () => {
    expect(deliveryText({ ...base, freeFrom: 300000 }, 'en', money).free).toBe(
      'Free delivery on orders from 300000$',
    );
    expect(deliveryText(base, 'en', money).free).toBeNull();
  });

  it('tracks the basket against the free threshold at the boundary', () => {
    const s = { ...base, freeFrom: 300000 };
    expect(deliveryText(s, 'en', money, 0).free).toBe('300000$ more for free delivery');
    expect(deliveryText(s, 'en', money, 299999).free).toBe('1$ more for free delivery');
    expect(deliveryText(s, 'en', money, 300000).free).toBe('Delivery is free');
    expect(deliveryText(s, 'en', money, 400000).free).toBe('Delivery is free');
  });

  it('never shows a free-delivery line with freeFrom 0, even at amount 0', () => {
    expect(deliveryText(base, 'en', money, 0).free).toBeNull();
  });

  it('describes the minimum order and its shortfall', () => {
    const s = { ...base, minOrder: 50000 };
    expect(deliveryText(s, 'en', money).min).toBe('Minimum order is 50000$');
    expect(deliveryText(s, 'en', money, 20000).min).toBe(
      'Minimum order is 50000$. Add 30000$ more',
    );
    expect(deliveryText(s, 'en', money, 50000).min).toBeNull();
    expect(deliveryText({ ...base, minOrder: 0 }, 'en', money).min).toBeNull();
    expect(deliveryText(base, 'en', money, 0).min).toBeNull();
  });

  it('localizes to uz and ru', () => {
    const s = { ...base, freeFrom: 100 };
    expect(deliveryText(s, 'uz', money, 40).free).toBe('Bepul yetkazishga 60$ qoldi');
    expect(deliveryText(s, 'ru', money, 40).free).toBe('До бесплатной доставки 60$');
  });
});
