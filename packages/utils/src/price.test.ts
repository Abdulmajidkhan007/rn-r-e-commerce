import { describe, expect, it } from 'vitest';
import { formatPrice, formatSom } from './price';

// Intl inserts locale-specific separators (often NBSP/narrow-NBSP). Comparing
// exact glyphs would make these tests ICU-version-fragile, so assert on the
// digits and the properties that actually matter to the UI.
const digitsOf = (s: string): string => s.replace(/\D/g, '');

describe('formatPrice', () => {
  it('renders the full som amount with no fraction digits', () => {
    const out = formatPrice(150_000);
    expect(digitsOf(out)).toBe('150000');
    expect(out).not.toMatch(/[.,]\d\d\b/);
  });

  it('groups thousands rather than printing a bare number', () => {
    expect(formatPrice(1_000_000)).not.toBe('1000000');
  });

  it('rounds fractional input — UZS has no minor units', () => {
    expect(digitsOf(formatPrice(1234.6))).toBe('1235');
  });

  it('formats zero without falling back to an empty string', () => {
    expect(digitsOf(formatPrice(0))).toBe('0');
  });

  it('keeps the same amount across locales, varying only presentation', () => {
    for (const locale of ['uz', 'en', 'ru'] as const) {
      expect(digitsOf(formatPrice(250_000, locale))).toBe('250000');
    }
  });
});

describe('formatSom', () => {
  it('omits any currency marker', () => {
    expect(formatSom(99_000)).not.toMatch(/UZS|so'm|сум/i);
  });

  it('still groups and rounds like formatPrice', () => {
    expect(digitsOf(formatSom(1234.4))).toBe('1234');
    expect(formatSom(1_000_000)).not.toBe('1000000');
  });
});
