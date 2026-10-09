import { describe, expect, it } from 'vitest';
import { blogParagraphs, BlogPostSchema } from './blog';
import { contactFormSchema } from './contact';
import { deliveryFeeFor, regionName, UZ_REGIONS } from './delivery';
import { evaluatePromo, normalizePromoCode, type PromoCode } from './promo';

const NOW = 1_800_000_000_000;
const promo = (over: Partial<PromoCode> = {}): PromoCode => ({
  id: 'BOLA10',
  type: 'percent',
  value: 10,
  minSubtotal: 0,
  active: true,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('evaluatePromo', () => {
  it('percent: floors to whole som', () => {
    expect(evaluatePromo(promo({ value: 15 }), 99_999, NOW)).toEqual({
      ok: true,
      discount: 14_999,
    });
  });
  it('fixed: never exceeds the subtotal', () => {
    expect(evaluatePromo(promo({ type: 'fixed', value: 50_000 }), 30_000, NOW)).toEqual({
      ok: true,
      discount: 30_000,
    });
  });
  it('rejects missing, inactive, expired and below-minimum codes with a reason', () => {
    expect(evaluatePromo(null, 100, NOW)).toEqual({ ok: false, reason: 'notFound' });
    expect(evaluatePromo(promo({ active: false }), 100, NOW)).toEqual({
      ok: false,
      reason: 'inactive',
    });
    expect(evaluatePromo(promo({ expiresAt: NOW }), 100, NOW)).toEqual({
      ok: false,
      reason: 'expired',
    });
    expect(evaluatePromo(promo({ minSubtotal: 200 }), 199, NOW)).toEqual({
      ok: false,
      reason: 'minSubtotal',
    });
  });
  it('normalizes typed codes', () => {
    expect(normalizePromoCode('  bola 10 ')).toBe('BOLA10');
  });
});

describe('deliveryFeeFor', () => {
  const settings = { defaultFee: 40_000, regions: { 'tashkent-city': 20_000 }, freeFrom: 500_000 };
  it('uses the region fee, else the default', () => {
    expect(deliveryFeeFor(settings, 'tashkent-city', 100_000)).toBe(20_000);
    expect(deliveryFeeFor(settings, 'fergana', 100_000)).toBe(40_000);
    expect(deliveryFeeFor(settings, 'Toshkent (eski matn)', 100_000)).toBe(40_000);
  });
  it('is free from the threshold, and when nothing is configured', () => {
    expect(deliveryFeeFor(settings, 'fergana', 500_000)).toBe(0);
    expect(deliveryFeeFor({ ...settings, freeFrom: 0 }, 'fergana', 9_999_999)).toBe(40_000);
    expect(deliveryFeeFor(null, 'fergana', 1)).toBe(0);
  });
  it('lists all 14 regions with unique ids', () => {
    expect(new Set(UZ_REGIONS.map((r) => r.id)).size).toBe(14);
    expect(regionName('fergana')?.uz).toBe('Fargʻona');
  });
});

describe('blog', () => {
  it('splits the body on blank lines and drops empties', () => {
    expect(blogParagraphs('Bir.\n\n\n  Ikki\nqator.  \n \n')).toEqual(['Bir.', 'Ikki\nqator.']);
  });
  it('accepts only url-safe slugs', () => {
    const base = {
      id: 'b1',
      title: { uz: 'T' },
      excerpt: { uz: 'E' },
      body: { uz: 'B' },
      published: true,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(BlogPostSchema.safeParse({ ...base, slug: 'yozgi-kiyimlar-2026' }).success).toBe(true);
    expect(BlogPostSchema.safeParse({ ...base, slug: 'Yozgi kiyim' }).success).toBe(false);
  });
});

describe('contactFormSchema', () => {
  const ok = { name: 'Ali', phone: '+998 90 123 45 67', email: '', message: 'Salom, savol bor' };
  it('accepts a valid form with an empty email', () => {
    expect(contactFormSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects a bad phone, bad email and a too-short message', () => {
    expect(contactFormSchema.safeParse({ ...ok, phone: 'abc' }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...ok, email: 'not-an-email' }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...ok, message: 'hi' }).success).toBe(false);
  });
});
