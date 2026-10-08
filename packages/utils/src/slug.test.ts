import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and dashes plain text', () => {
    expect(slugify('Summer Dress')).toBe('summer-dress');
  });

  it('collapses runs of punctuation and whitespace into one dash', () => {
    expect(slugify('Boys   T-Shirt / 2026!!')).toBe('boys-t-shirt-2026');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });

  it('transliterates Uzbek letters instead of dropping them', () => {
    expect(slugify('Qishki ko‘ylak')).toBe('qishki-koylak');
    expect(slugify('шапка')).toBe('shapka');
  });

  it('produces an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('is idempotent — slugifying a slug changes nothing', () => {
    const once = slugify('Bolalar kiyimi / 2026');
    expect(slugify(once)).toBe(once);
  });
});
