import type { AppLocale } from './price';

const INTL_LOCALE: Record<AppLocale, string> = {
  uz: 'uz-UZ',
  en: 'en-US',
  ru: 'ru-RU',
};

type DateInput = string | number | Date;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/** Formats a date as a medium-length localized date, e.g. "26 iyun 2026". */
export function formatDate(input: DateInput, locale: AppLocale = 'uz'): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toDate(input));
}

/** Formats a date with time, e.g. "26 iyun 2026, 14:30". */
export function formatDateTime(input: DateInput, locale: AppLocale = 'uz'): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(input));
}
