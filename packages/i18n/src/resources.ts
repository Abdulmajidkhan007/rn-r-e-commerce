import uzCommon from './locales/uz/common.json';
import enCommon from './locales/en/common.json';
import ruCommon from './locales/ru/common.json';

export const defaultNS = 'common' as const;

export const supportedLanguages = ['uz', 'en', 'ru'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const fallbackLanguage: SupportedLanguage = 'uz';

export const resources = {
  uz: { common: uzCommon },
  en: { common: enCommon },
  ru: { common: ruCommon },
} as const;

export type Resources = typeof resources;
