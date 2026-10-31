import { describe, expect, it } from 'vitest';
import {
  applyClientFilters,
  categoryIdsWithProducts,
  collectSizes,
  filterProducts,
  gendersFor,
  hasClientFilters,
  matchesAgeBand,
  pickSimilar,
} from './catalogFilter';
import type { Product } from './product';

function product(over: Partial<Product> & { id: string }): Product {
  return {
    name: { uz: over.id, en: over.id, ru: over.id },
    description: { uz: '', en: '', ru: '' },
    price: 100_000,
    categoryId: 'jackets',
    images: [],
    sizes: ['98', '104'],
    colors: [],
    stock: 5,
    rating: 0,
    reviewCount: 0,
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

const catalog = [
  product({
    id: 'a',
    gender: 'boys',
    ageFromMonths: 24,
    ageToMonths: 48,
    price: 100_000,
    sizes: ['98', '104'],
  }),
  product({
    id: 'b',
    gender: 'girls',
    ageFromMonths: 36,
    ageToMonths: 72,
    price: 250_000,
    sizes: ['110'],
  }),
  product({
    id: 'c',
    gender: 'unisex',
    ageFromMonths: 0,
    ageToMonths: 11,
    price: 60_000,
    sizes: ['56', '62'],
  }),
  product({ id: 'd', price: 150_000, sizes: ['98'] }), // legacy: no gender / age
];
const ids = (list: Product[]): string[] => list.map((p) => p.id);

describe('filterProducts', () => {
  it('filters by size', () => {
    expect(ids(filterProducts(catalog, { size: '98' }))).toEqual(['a', 'd']);
  });

  it('gender includes unisex but not products with unknown gender', () => {
    expect(gendersFor('boys')).toEqual(['boys', 'unisex']);
    expect(ids(filterProducts(catalog, { gender: 'boys' }))).toEqual(['a', 'c']);
    expect(ids(filterProducts(catalog, { gender: 'girls' }))).toEqual(['b', 'c']);
    expect(ids(filterProducts(catalog, { gender: 'unisex' }))).toEqual(['c']);
  });

  it('age band matches overlapping ranges and never unknown age', () => {
    expect(ids(filterProducts(catalog, { ageBand: '1-3' }))).toEqual(['a']);
    expect(ids(filterProducts(catalog, { ageBand: '3-6' }))).toEqual(['a', 'b']);
    expect(ids(filterProducts(catalog, { ageBand: '0-1' }))).toEqual(['c']);
    expect(ids(filterProducts(catalog, { ageBand: '9-12' }))).toEqual([]);
    expect(matchesAgeBand({ ageFromMonths: 12 }, '1-3')).toBe(true); // open-ended
    expect(matchesAgeBand({}, '1-3')).toBe(false);
  });

  it('price range is inclusive and either bound is optional', () => {
    expect(ids(filterProducts(catalog, { priceMin: 100_000, priceMax: 150_000 }))).toEqual([
      'a',
      'd',
    ]);
    expect(ids(filterProducts(catalog, { priceMax: 60_000 }))).toEqual(['c']);
    expect(ids(filterProducts(catalog, { priceMin: 200_000 }))).toEqual(['b']);
  });

  it('combines every filter with AND', () => {
    expect(
      ids(
        filterProducts(catalog, { gender: 'boys', ageBand: '1-3', size: '98', priceMax: 120_000 }),
      ),
    ).toEqual(['a']);
    expect(ids(filterProducts(catalog, { gender: 'girls', size: '98' }))).toEqual([]);
    expect(ids(filterProducts(catalog, {}))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('client/server split', () => {
  it('leaves size and gender to Firestore unless a search token took the array-contains', () => {
    const f = { size: '98', gender: 'boys' as const, priceMax: 120_000 };
    expect(ids(applyClientFilters(catalog, f, false))).toEqual(['a', 'c']);
    expect(ids(applyClientFilters(catalog, f, true))).toEqual(['a']);
  });

  it('knows when pages may need topping up', () => {
    expect(hasClientFilters({}, false)).toBe(false);
    expect(hasClientFilters({ size: '98' }, false)).toBe(false);
    expect(hasClientFilters({ size: '98' }, true)).toBe(true);
    expect(hasClientFilters({ priceMin: 1 }, false)).toBe(true);
    expect(hasClientFilters({ ageBand: '1-3' }, false)).toBe(true);
  });
});

describe('collectSizes / categoryIdsWithProducts', () => {
  it('lists distinct sizes in natural order', () => {
    expect(collectSizes(catalog)).toEqual(['56', '62', '98', '104', '110']);
  });

  it('keeps only categories that have a visible product', () => {
    const list = [
      product({ id: '1', categoryId: 'x' }),
      product({ id: '2', categoryId: 'y', isActive: false }),
      product({ id: '3', categoryId: 'z', isDraft: true }),
      product({ id: '4', categoryId: 'w', deletedAt: 5, isActive: false }),
    ];
    expect([...categoryIdsWithProducts(list)]).toEqual(['x']);
  });
});

describe('pickSimilar', () => {
  const base = product({
    id: 'base',
    gender: 'boys',
    ageFromMonths: 24,
    ageToMonths: 48,
    price: 100_000,
  });

  it('excludes the product itself and hidden products', () => {
    const out = pickSimilar(base, [
      base,
      product({ id: 'x' }),
      product({ id: 'draft', isDraft: true }),
      product({ id: 'off', isActive: false }),
    ]);
    expect(ids(out)).toEqual(['x']);
  });

  it('ranks the same category above other categories', () => {
    const out = pickSimilar(base, [
      product({
        id: 'other',
        categoryId: 'pants',
        gender: 'boys',
        ageFromMonths: 24,
        ageToMonths: 48,
        price: 100_000,
      }),
      product({ id: 'same', categoryId: 'jackets', gender: 'girls', price: 900_000 }),
    ]);
    expect(ids(out)).toEqual(['same', 'other']);
  });

  it('prefers matching gender, nearer age and nearer price within a category', () => {
    const out = pickSimilar(base, [
      product({ id: 'girls', gender: 'girls', ageFromMonths: 24, ageToMonths: 48, price: 100_000 }),
      product({
        id: 'boysFar',
        gender: 'boys',
        ageFromMonths: 120,
        ageToMonths: 144,
        price: 100_000,
      }),
      product({
        id: 'boysNear',
        gender: 'boys',
        ageFromMonths: 30,
        ageToMonths: 50,
        price: 110_000,
      }),
    ]);
    expect(ids(out)[0]).toBe('boysNear');
    expect(ids(out)).toHaveLength(3);
  });

  it('respects the limit and is deterministic on ties (newest first)', () => {
    const many = Array.from({ length: 12 }, (_, i) => product({ id: `p${i}`, createdAt: i }));
    const out = pickSimilar(base, many, 5);
    expect(out).toHaveLength(5);
    expect(ids(out)).toEqual(['p11', 'p10', 'p9', 'p8', 'p7']);
  });
});
