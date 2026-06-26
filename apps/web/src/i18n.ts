import LanguageDetector from 'i18next-browser-languagedetector';
import { initI18n } from '@kidswear/i18n';

/** Web i18n instance using the browser language detector. */
export const i18n = initI18n({ detector: LanguageDetector });
