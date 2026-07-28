import { describe, expect, it } from 'vitest';
import { pickLocalized } from './localized';

describe('pickLocalized', () => {
  const full = { uz: 'Koʻylak', en: 'Dress', ru: 'Платье' };

  it('returns the requested locale when present', () => {
    expect(pickLocalized(full, 'en')).toBe('Dress');
    expect(pickLocalized(full, 'ru')).toBe('Платье');
    expect(pickLocalized(full, 'uz')).toBe('Koʻylak');
  });

  it('falls back to uz when a translation is missing', () => {
    expect(pickLocalized({ uz: 'Koʻylak' }, 'en')).toBe('Koʻylak');
  });

  it('falls back when a translation is present but empty', () => {
    // Admin forms can save a blank optional field; an empty label is a bug,
    // so an empty string must not win over the uz original.
    expect(pickLocalized({ uz: 'Koʻylak', en: '' }, 'en')).toBe('Koʻylak');
  });
});
