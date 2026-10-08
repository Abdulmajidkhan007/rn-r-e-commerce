import type { AppLocale } from './price';

/** Minimal shape of @kidswear/core's LocalizedText (kept dependency-free). */
export interface LocalizedLike {
  uz: string;
  en?: string;
  ru?: string;
}

/**
 * Picks the best localized string for a locale, falling back to uz.
 *
 * Blank counts as missing: the admin forms default `en`/`ru` to `''` and submit
 * them as-is, so a category saved without a translation stores an empty string.
 * Falling back only on null/undefined would render an empty label instead.
 */
export function pickLocalized(text: LocalizedLike, locale: AppLocale): string {
  const value = text[locale];
  return value != null && value.trim() !== '' ? value : text.uz;
}
