import { describe, expect, it } from 'vitest';
import type { Product } from './product';
import { TvSettingsSchema, nextSlideIndex, selectTvSlides, toTvSlide, type TvSettings } from './tv';

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: { uz: id },
    description: { uz: 'tavsif' },
    price: 100_000,
    categoryId: 'c1',
    images: [`kwimg:${id}`],
    sizes: ['2-3'],
    colors: [],
    stock: 5,
    rating: 4,
    reviewCount: 2,
    isActive: true,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const news: TvSettings = { source: 'new', slideSeconds: 8 };

describe('toTvSlide', () => {
  it('exposes only the whitelisted public fields', () => {
    const slide = toTvSlide(
      product('a', { searchTokens: ['x'], variants: [], description: { uz: 'maxfiy?' } }),
    );
    expect(Object.keys(slide).sort()).toEqual(['compareAtPrice', 'id', 'image', 'name', 'price']);
    expect(JSON.stringify(slide)).not.toMatch(/tavsif|maxfiy|stock|cost|searchTokens/);
  });
  it('keeps compareAtPrice only when it is really a discount', () => {
    expect(toTvSlide(product('a', { compareAtPrice: 150_000 })).compareAtPrice).toBe(150_000);
    expect(toTvSlide(product('a', { compareAtPrice: 100_000 })).compareAtPrice).toBeUndefined();
  });
});

describe('selectTvSlides', () => {
  const all = [
    product('old', { createdAt: 1 }),
    product('new', { createdAt: 9 }),
    product('sale', { createdAt: 5, compareAtPrice: 200_000 }),
    product('draft', { isDraft: true }),
    product('trashed', { deletedAt: 3 }),
    product('hidden', { isActive: false }),
    product('empty', { stock: 0 }),
    product('other', { categoryId: 'c2', createdAt: 7 }),
  ];
  it('shows newest first and drops drafts, trash, hidden and out-of-stock', () => {
    expect(selectTvSlides(all, news).map((s) => s.id)).toEqual(['new', 'other', 'sale', 'old']);
  });
  it('sale keeps only discounted products', () => {
    expect(selectTvSlides(all, { ...news, source: 'sale' }).map((s) => s.id)).toEqual(['sale']);
  });
  it('category keeps one category', () => {
    expect(
      selectTvSlides(all, { ...news, source: 'category', categoryId: 'c2' }).map((s) => s.id),
    ).toEqual(['other']);
  });
});

describe('nextSlideIndex', () => {
  it('wraps around and survives an empty or shrunken list', () => {
    expect(nextSlideIndex(0, 3)).toBe(1);
    expect(nextSlideIndex(2, 3)).toBe(0);
    expect(nextSlideIndex(5, 0)).toBe(0);
  });
});

describe('TvSettingsSchema', () => {
  it('bounds the slide time', () => {
    expect(TvSettingsSchema.safeParse({ source: 'new', slideSeconds: 2 }).success).toBe(false);
    expect(TvSettingsSchema.safeParse({ source: 'new', slideSeconds: 61 }).success).toBe(false);
    expect(TvSettingsSchema.safeParse({ source: 'sale', slideSeconds: 10 }).success).toBe(true);
  });
});
