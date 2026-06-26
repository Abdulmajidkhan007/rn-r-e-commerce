import i18n, { type i18n as I18nInstance, type Module, type NewableModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  resources,
  defaultNS,
  fallbackLanguage,
  supportedLanguages,
} from './resources';

/** Anything `i18next.use()` accepts: a module, a constructable module, or a plugin. */
export type I18nDetector = Module | NewableModule<Module>;

export interface InitI18nOptions {
  /**
   * Platform-specific language detector.
   * - Web: `i18next-browser-languagedetector`
   * - Mobile: a custom expo-localization detector
   */
  detector?: I18nDetector;
  /** Force an initial language, bypassing detection. */
  language?: string;
  debug?: boolean;
}

/**
 * Builds and initializes the shared i18n instance. Both apps call this once at
 * startup, passing their own language detector.
 */
export function initI18n(options: InitI18nOptions = {}): I18nInstance {
  const { detector, language, debug = false } = options;

  if (detector) {
    i18n.use(detector);
  }

  i18n.use(initReactI18next);

  if (!i18n.isInitialized) {
    void i18n.init({
      resources,
      defaultNS,
      ns: [defaultNS],
      fallbackLng: fallbackLanguage,
      supportedLngs: [...supportedLanguages],
      load: 'languageOnly',
      interpolation: { escapeValue: false },
      returnNull: false,
      debug,
      // Only pin a language when explicitly provided; otherwise let the
      // detector (or fallback) decide.
      ...(language ? { lng: language } : {}),
    });
  }

  return i18n;
}

export { i18n };
