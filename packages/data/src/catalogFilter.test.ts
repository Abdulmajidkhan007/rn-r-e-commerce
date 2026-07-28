import { describe, expect, it } from 'vitest';
import { filterAndSortProducts, matchesSearch, sortProducts } from './catalogFilter';
import { makeProduct } from './testFixtures';

const product = makeProduct;

describe('matchesSearch', () => {
  const p = product({ id: '1', name: { uz: 'Koʻylak', en: 'Dress', ru: 'Платье' } });

  it('matches any locale, not just the active one', () => {
    expect(matchesSearch(p, 'dress')).toBe(true);
    expect(matchesSearch(p, 'платье')).toBe(true);
    expect(matchesSearch(p, 'koʻylak')).toBe(true);
  });

  it('matches on a substring, not only a prefix', () => {
    expect(matchesSearch(p, 'res')).toBe(true);
  });

  it('is case-insensitive for the product side', () => {
    // Callers lowercase the term; the product text must be lowercased too.
    expect(matchesSearch(product({ id: '2', name: { uz: 'SHIM' } }), 'shim')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesSearch(p, 'shim')).toBe(false);
  });

  it('tolerates missing translations', () => {
    const uzOnly = product({ id: '3', name: { uz: 'Shim' } });
    expect(matchesSearch(uzOnly, 'shim')).toBe(true);
    expect(matchesSearch(uzOnly, 'trousers')).toBe(false);
  });
});

describe('sortProducts', () => {
  const cheap = product({ id: 'cheap', price: 50_000 });
  const mid = product({ id: 'mid', price: 100_000 });
  const dear = product({ id: 'dear', price: 300_000 });
  const list = [mid, dear, cheap];

  it('sorts ascending by price', () => {
    expect(sortProducts(list, 'priceAsc').map((p) => p.id)).toEqual(['cheap', 'mid', 'dear']);
  });

  it('sorts descending by price', () => {
    expect(sortProducts(list, 'priceDesc').map((p) => p.id)).toEqual(['dear', 'mid', 'cheap']);
  });

  it('preserves server order for newest and for no sort', () => {
    expect(sortProducts(list, 'newest').map((p) => p.id)).toEqual(['mid', 'dear', 'cheap']);
    expect(sortProducts(list, undefined).map((p) => p.id)).toEqual(['mid', 'dear', 'cheap']);
  });

  it('never mutates the caller array — React state is passed in directly', () => {
    const original = [...list];
    sortProducts(list, 'priceAsc');
    expect(list).toEqual(original);
  });
});

describe('filterAndSortProducts', () => {
  const a = product({ id: 'a', name: { uz: 'Koʻylak' }, price: 300_000 });
  const b = product({ id: 'b', name: { uz: 'Koʻylak uzun' }, price: 100_000 });
  const c = product({ id: 'c', name: { uz: 'Shim' }, price: 200_000 });
  const list = [a, b, c];

  it('searches first, then sorts the survivors', () => {
    expect(filterAndSortProducts(list, 'koʻylak', 'priceAsc').map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('treats a blank or whitespace-only search as no search', () => {
    expect(filterAndSortProducts(list, '   ', undefined)).toHaveLength(3);
    expect(filterAndSortProducts(list, undefined, undefined)).toHaveLength(3);
  });

  it('trims and lowercases the term so stray input still matches', () => {
    expect(filterAndSortProducts(list, '  SHIM  ', undefined).map((p) => p.id)).toEqual(['c']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterAndSortProducts(list, 'palto', undefined)).toEqual([]);
  });
});
