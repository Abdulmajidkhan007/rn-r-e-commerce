import { describe, expect, it } from 'vitest';
import type { CartItem } from '@kidswear/core';
import { addItem, cartReducer, removeItem, updateQty, type CartState } from './cartSlice';

const line = (over: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  name: 'Koʻylak',
  image: '',
  price: 100_000,
  quantity: 1,
  size: '98',
  color: 'Koʻk',
  variantId: '98|Ko%CA%BBk',
  ...over,
});

describe('cartSlice with variants', () => {
  it('keeps different variants of one product as separate lines', () => {
    let state: CartState = cartReducer(undefined, addItem(line()));
    state = cartReducer(state, addItem(line({ size: '104', variantId: '104|Ko%CA%BBk' })));
    expect(state.items).toHaveLength(2);
  });

  it('merges the same variant', () => {
    let state: CartState = cartReducer(undefined, addItem(line()));
    state = cartReducer(state, addItem(line({ quantity: 2 })));
    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.quantity).toBe(3);
  });

  it('keeps a persisted pre-variant line working and upgrades it on re-add', () => {
    const { variantId: _legacy, ...legacyLine } = line({ price: 90_000 });
    const persisted: CartState = { items: [legacyLine] };

    const bumped = cartReducer(persisted, updateQty({ ...legacyLine, quantity: 4 }));
    expect(bumped.items[0]?.quantity).toBe(4);

    const upgraded = cartReducer(persisted, addItem(line()));
    expect(upgraded.items).toHaveLength(1);
    expect(upgraded.items[0]).toMatchObject({
      variantId: '98|Ko%CA%BBk',
      price: 100_000,
      quantity: 2,
    });

    expect(cartReducer(persisted, removeItem(legacyLine)).items).toHaveLength(0);
  });
});
