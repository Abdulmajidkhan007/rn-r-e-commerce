import { describe, expect, it } from 'vitest';
import { applyLinesToStock, saleMoves } from './stock.js';

const line = (over: Partial<Parameters<typeof applyLinesToStock>[1][number]> = {}) => ({
  productId: 'p',
  quantity: 1,
  price: 1,
  ...over,
});

describe('applyLinesToStock', () => {
  it('decrements a legacy product from its shared stock', () => {
    expect(applyLinesToStock({ stock: 3 }, [line({ quantity: 2 })])).toEqual({ stock: 1 });
    expect(applyLinesToStock({ stock: 1 }, [line({ quantity: 2 })])).toBeNull();
  });

  it('decrements the ordered variant and keeps stock as the sum', () => {
    const variants = [
      { id: 'S|Red', size: 'S', color: 'Red', stock: 2 },
      { id: 'M|Red', size: 'M', color: 'Red', stock: 5 },
    ];
    expect(
      applyLinesToStock({ stock: 7, variants }, [line({ variantId: 'M|Red', quantity: 2 })]),
    ).toEqual({
      stock: 5,
      variants: [variants[0], { ...variants[1], stock: 3 }],
    });
    expect(
      applyLinesToStock({ stock: 7, variants }, [line({ size: 'S', color: 'Red', quantity: 3 })]),
    ).toBeNull();
    expect(applyLinesToStock({ stock: 7, variants }, [line({ variantId: 'gone' })])).toBeNull();
  });
});

describe('saleMoves', () => {
  it('one negative row per variant; legacy products use the default variant', () => {
    expect(saleMoves({ stock: 5 }, [line({ quantity: 2 }), line({ size: 'X' })])).toEqual([
      { variantId: 'default', delta: -3 },
    ]);
    const variants = [{ id: 'S|Red', size: 'S', color: 'Red', stock: 4 }];
    expect(
      saleMoves({ stock: 4, variants }, [
        line({ variantId: 'S|Red' }),
        line({ size: 'S', color: 'Red', quantity: 2 }),
      ]),
    ).toEqual([{ variantId: 'S|Red', delta: -3 }]);
  });
});
