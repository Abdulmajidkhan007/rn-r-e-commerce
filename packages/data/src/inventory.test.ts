import { describe, expect, it } from 'vitest';
import { InventoryError } from '@kidswear/firebase';
import { stockErrorMessage } from './inventory';
import { makeOrder } from './testFixtures';

const order = makeOrder({
  items: [
    {
      productId: 'p1',
      name: 'Kofta',
      image: '',
      price: 1,
      quantity: 1,
      size: 'M',
      color: 'Red',
      variantId: 'M|Red',
    },
    {
      productId: 'p1',
      name: 'Kofta',
      image: '',
      price: 1,
      quantity: 1,
      size: 'S',
      color: 'Red',
      variantId: 'S|Red',
    },
  ],
});

describe('stockErrorMessage', () => {
  it('names the order line whose variant ran short', () => {
    expect(stockErrorMessage(new InventoryError('insufficient', 'p1', 'S|Red'), order)).toEqual({
      key: 'inventory.shortfallFor',
      params: { name: 'Kofta', variant: 'S / Red' },
    });
  });

  it('falls back to the error key, or a generic one for foreign errors', () => {
    expect(stockErrorMessage(new InventoryError('productNotFound', 'p9'), order)).toEqual({
      key: 'inventory.errors.productNotFound',
    });
    expect(stockErrorMessage(new Error('boom'))).toEqual({ key: 'inventory.errors.generic' });
  });
});
