import { describe, expect, it } from 'vitest';
import { ProductSchema } from './product';
import { CartItemSchema } from './cart';
import {
  DEFAULT_VARIANT_ID,
  buildVariantMatrix,
  describeVariantPicker,
  findVariant,
  initialFormVariants,
  isLegacyProduct,
  productVariants,
  pruneExcluded,
  resolveLineVariant,
  stockCoversLines,
  totalVariantStock,
  variantIdFor,
  variantPriceRange,
  type ProductVariant,
  type VariantSource,
} from './variant';

const legacy: VariantSource = { price: 100_000, stock: 7, sizes: ['98', '104'], colors: ['Kok'] };

function withVariants(variants: ProductVariant[]): VariantSource {
  return {
    price: 100_000,
    stock: totalVariantStock(variants),
    sizes: ['S', 'M', 'L'],
    colors: ['Red', 'Blue'],
    variants,
  };
}

const matrix = buildVariantMatrix(['S', 'M', 'L'], ['Red', 'Blue']).map((v, i) => ({
  ...v,
  stock: i, // S/Red 0, S/Blue 1, M/Red 2, M/Blue 3, L/Red 4, L/Blue 5
}));

describe('variant ids', () => {
  it('is deterministic and collision-safe', () => {
    expect(variantIdFor('S', 'Red')).toBe(variantIdFor('S', 'Red'));
    expect(variantIdFor('a|b', 'c')).not.toBe(variantIdFor('a', 'b|c'));
  });
});

describe('buildVariantMatrix', () => {
  it('builds sizes × colors (3 × 2 = 6)', () => {
    const rows = buildVariantMatrix(['S', 'M', 'L'], ['Red', 'Blue']);
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.stock === 0)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(6);
  });

  it('treats an empty axis as one blank value', () => {
    expect(buildVariantMatrix(['S', 'M'], [])).toEqual([
      { id: variantIdFor('S', ''), size: 'S', color: '', stock: 0 },
      { id: variantIdFor('M', ''), size: 'M', color: '', stock: 0 },
    ]);
    expect(buildVariantMatrix([], [])).toHaveLength(1);
  });

  it('drops excluded combinations and keeps typed numbers when an axis grows', () => {
    const first = buildVariantMatrix(['S'], ['Red', 'Blue']).map((v) => ({
      ...v,
      stock: 5,
      price: 90_000,
    }));
    const excluded = [variantIdFor('M', 'Blue')];
    const next = buildVariantMatrix(['S', 'M'], ['Red', 'Blue'], first, excluded);
    expect(next.map((v) => v.id)).toEqual([
      variantIdFor('S', 'Red'),
      variantIdFor('S', 'Blue'),
      variantIdFor('M', 'Red'),
    ]);
    expect(next[0]).toMatchObject({ stock: 5, price: 90_000 });
    expect(next[2]).toMatchObject({ stock: 0 });
  });

  it('prunes exclusions that no longer name a combination', () => {
    expect(
      pruneExcluded(['S'], ['Red'], [variantIdFor('S', 'Red'), variantIdFor('XL', 'Red')]),
    ).toEqual([variantIdFor('S', 'Red')]);
  });
});

describe('legacy products (no variants)', () => {
  it('get one default variant from the product stock', () => {
    expect(isLegacyProduct(legacy)).toBe(true);
    expect(productVariants(legacy)).toEqual([
      { id: DEFAULT_VARIANT_ID, size: '', color: '', stock: 7 },
    ]);
    expect(findVariant(legacy, '104', 'Kok')?.id).toBe(DEFAULT_VARIANT_ID);
  });

  it('still parse with the product schema', () => {
    const doc = {
      id: 'p1',
      name: { uz: 'Koʻylak' },
      description: { uz: '' },
      price: 100_000,
      categoryId: 'c1',
      images: [],
      sizes: [],
      colors: [],
      stock: 3,
      rating: 0,
      reviewCount: 0,
      isActive: true,
      createdAt: 1,
      updatedAt: 1,
    };
    expect(ProductSchema.parse(doc).variants).toBeUndefined();
  });

  it('keep all options enabled while in stock and sell from shared stock', () => {
    const picker = describeVariantPicker(legacy, '98', 'Kok');
    expect(picker.sizes.every((o) => !o.disabled)).toBe(true);
    expect(picker).toMatchObject({ canAdd: true, available: 7, price: 100_000 });
  });

  it('open the admin form with zero-stock rows unless a single combination remains', () => {
    expect(initialFormVariants(legacy).map((v) => v.stock)).toEqual([0, 0]);
    expect(initialFormVariants({ ...legacy, sizes: [], colors: [] })).toEqual([
      { id: variantIdFor('', ''), size: '', color: '', stock: 7 },
    ]);
  });

  it('accept a pre-variant cart line (no variantId)', () => {
    expect(
      CartItemSchema.parse({
        productId: 'p',
        name: 'n',
        image: '',
        price: 1,
        quantity: 1,
        size: '',
        color: '',
      }).variantId,
    ).toBeUndefined();
    expect(resolveLineVariant(legacy, { size: '98', color: 'Kok' })?.id).toBe(DEFAULT_VARIANT_ID);
  });
});

describe('describeVariantPicker', () => {
  const product = withVariants(
    matrix.map((v) => (v.id === variantIdFor('L', 'Blue') ? { ...v, price: 120_000 } : v)),
  );

  it('disables a sold-out combination given the other pick', () => {
    const p = describeVariantPicker(product, 'S', null);
    expect(p.colors.find((o) => o.value === 'Red')?.disabled).toBe(true);
    expect(p.colors.find((o) => o.value === 'Blue')?.disabled).toBe(false);
    expect(p.canAdd).toBe(false);
  });

  it('shows the variant price once picked, "from" before', () => {
    const before = describeVariantPicker(product, null, null);
    expect(before).toMatchObject({ price: 100_000, priceIsFrom: true });
    const after = describeVariantPicker(product, 'L', 'Blue');
    expect(after).toMatchObject({ price: 120_000, priceIsFrom: false, available: 5, canAdd: true });
  });

  it('never lets a zero-stock variant be added', () => {
    expect(describeVariantPicker(product, 'S', 'Red').canAdd).toBe(false);
  });

  it('reports the price range', () => {
    expect(variantPriceRange(product)).toEqual({ min: 100_000, max: 120_000 });
  });
});

describe('stockCoversLines', () => {
  const product = withVariants(matrix);

  it('checks each variant on its own stock', () => {
    const line = {
      productId: 'p',
      variantId: variantIdFor('M', 'Blue'),
      size: 'M',
      color: 'Blue',
      quantity: 3,
    };
    expect(stockCoversLines([line], [product])).toBe(true);
    expect(stockCoversLines([{ ...line, quantity: 4 }], [product])).toBe(false);
  });

  it('rejects a removed variant or deleted product', () => {
    const line = { productId: 'p', variantId: 'gone', size: 'S', color: 'Red', quantity: 1 };
    expect(stockCoversLines([line], [product])).toBe(false);
    expect(
      stockCoversLines([{ ...line, variantId: undefined, size: 'M', color: 'Red' }], [null]),
    ).toBe(false);
  });

  it('sums legacy lines against the shared stock', () => {
    const a = { productId: 'p', size: '98', color: 'Kok', quantity: 4 };
    const b = { productId: 'p', size: '104', color: 'Kok', quantity: 4 };
    expect(stockCoversLines([a], [legacy])).toBe(true);
    expect(stockCoversLines([a, b], [legacy, legacy])).toBe(false);
  });
});
