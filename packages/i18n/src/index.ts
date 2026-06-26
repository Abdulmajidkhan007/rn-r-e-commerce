/**
 * @kidswear/i18n — shared react-i18next setup.
 *
 * uz (default + fallback), en, ru. Apps call `initI18n({ detector })` with a
 * platform-specific language detector.
 */
import './types';

export { initI18n, i18n } from './config';
export type { I18nDetector, InitI18nOptions } from './config';
export { resources, defaultNS, fallbackLanguage, supportedLanguages } from './resources';
export type { SupportedLanguage, Resources } from './resources';

export { useTranslation, Trans } from 'react-i18next';
