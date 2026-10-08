import { describe, expect, it } from 'vitest';
import { getCopy, localeFor } from './i18n.js';
import type { OrderStatus } from '../types.js';

const ALL_STATUSES: readonly OrderStatus[] = [
  'pending',
  'deposit_paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

describe('localeFor', () => {
  it('uses the language mirrored onto the user doc', () => {
    expect(localeFor({ language: 'en' })).toBe('en');
    expect(localeFor({ language: 'ru' })).toBe('ru');
    expect(localeFor({ language: 'uz' })).toBe('uz');
  });

  it('falls back to uz when the field is missing', () => {
    // Profiles created before the language mirror was added have no field;
    // push must still be sent, not skipped.
    expect(localeFor({})).toBe('uz');
  });

  it('falls back to uz for an unsupported or malformed value', () => {
    expect(localeFor({ language: 'de' })).toBe('uz');
    expect(localeFor({ language: 42 })).toBe('uz');
    expect(localeFor({ language: null })).toBe('uz');
  });
});

describe('getCopy', () => {
  it('provides a non-empty label for every order status in every locale', () => {
    // A missing label would surface as an empty push notification title.
    for (const locale of ['uz', 'en', 'ru'] as const) {
      const copy = getCopy(locale);
      for (const status of ALL_STATUSES) {
        expect(copy.status[status], `${locale}/${status}`).toBeTruthy();
      }
    }
  });

  it('provides the push titles and bodies the triggers use', () => {
    for (const locale of ['uz', 'en', 'ru'] as const) {
      const copy = getCopy(locale);
      expect(copy.newOrder).toBeTruthy();
      expect(copy.orderCancelled).toBeTruthy();
      expect(copy.outOfStockReason).toBeTruthy();
    }
  });

  it('interpolates the status label into the body', () => {
    const copy = getCopy('en');
    expect(copy.statusBody('Shipped')).toContain('Shipped');
  });

  it('differs across locales — the strings are actually translated', () => {
    expect(getCopy('en').newOrder).not.toBe(getCopy('ru').newOrder);
    expect(getCopy('uz').newOrder).not.toBe(getCopy('ru').newOrder);
  });
});
