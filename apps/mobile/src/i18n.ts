import type { LanguageDetectorModule } from 'i18next';
import { getLocales } from 'expo-localization';
import {
  initI18n,
  fallbackLanguage,
  supportedLanguages,
  type SupportedLanguage,
} from '@kidswear/i18n';

function pickDeviceLanguage(): SupportedLanguage {
  const codes = getLocales().map((l) => l.languageCode);
  const match = codes.find(
    (code): code is SupportedLanguage =>
      !!code && (supportedLanguages as readonly string[]).includes(code),
  );
  return match ?? fallbackLanguage;
}

/** Custom i18next detector backed by expo-localization. */
const expoLocalizationDetector: LanguageDetectorModule = {
  type: 'languageDetector',
  init: () => undefined,
  detect: () => pickDeviceLanguage(),
  cacheUserLanguage: () => undefined,
};

/** Mobile i18n instance using the device locale. */
export const i18n = initI18n({ detector: expoLocalizationDetector });
