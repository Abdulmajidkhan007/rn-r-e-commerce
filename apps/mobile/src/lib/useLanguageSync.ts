import { useEffect } from 'react';
import { useAppSelector } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';

/**
 * Applies the persisted `ui.language` to i18next. Mounted once at the app root
 * so the language follows the store wherever it is changed.
 */
export function useLanguageSync(): void {
  const language = useAppSelector((s) => s.ui.language);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);
}
