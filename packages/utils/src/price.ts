/** Supported app locales, kept in sync with @kidswear/i18n. */
export type AppLocale = 'uz' | 'en' | 'ru';

const CURRENCY = 'UZS';

/** Maps an app locale to a BCP-47 tag suitable for Intl in the UZ market. */
const INTL_LOCALE: Record<AppLocale, string> = {
  uz: 'uz-UZ',
  en: 'en-US',
  ru: 'ru-RU',
};

/**
 * Formats an integer amount of som as UZS currency.
 *
 * UZS has no minor units, so the value is treated as a whole number of som
 * and rendered without fraction digits, e.g. `formatPrice(150000) → "150 000 so'm"`.
 */
export function formatPrice(amountSom: number, locale: AppLocale = 'uz'): string {
  const value = Math.round(amountSom);
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats just the numeric part of a som amount (grouped digits, no currency
 * symbol). Useful when the UI shows the currency label separately.
 */
export function formatSom(amountSom: number, locale: AppLocale = 'uz'): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    maximumFractionDigits: 0,
  }).format(Math.round(amountSom));
}
