import type { AppLocale } from './price';

/** Minimal shape of @kidswear/core's LocalizedText (kept dependency-free). */
export interface LocalizedLike {
  uz: string;
  en?: string;
  ru?: string;
}

/** Picks the best localized string for a locale, falling back to uz. */
export function pickLocalized(text: LocalizedLike, locale: AppLocale): string {
  return text[locale] ?? text.uz;
}
