import { useEffect } from 'react';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';

/**
 * Keeps i18next on the persisted `ui.language` preference (default `uz`).
 *
 * Mounted once at the root: this used to live inside LanguageSwitcher, which
 * only renders on the auth screens — so the shop showed the browser's language
 * (English on most phones) while sign-in showed Uzbek.
 */
export function LanguageSync(): null {
  const language = useAppSelector((s) => s.ui.language);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
    document.documentElement.lang = language;
  }, [language, i18n]);

  return null;
}
