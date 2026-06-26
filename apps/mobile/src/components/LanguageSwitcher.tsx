import { useEffect } from 'react';
import { SegmentedButtons } from 'react-native-paper';
import { useAppDispatch, useAppSelector, setLanguage } from '@kidswear/store';
import { supportedLanguages, type SupportedLanguage, useTranslation } from '@kidswear/i18n';

const LABELS: Record<SupportedLanguage, string> = {
  uz: 'UZ',
  en: 'EN',
  ru: 'RU',
};

/** Switches the active language, persisted via uiSlice and applied to i18next. */
export function LanguageSwitcher(): React.ReactElement {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.ui.language);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <SegmentedButtons
      value={language}
      onValueChange={(value) => dispatch(setLanguage(value as SupportedLanguage))}
      buttons={supportedLanguages.map((lng) => ({ value: lng, label: LABELS[lng] }))}
    />
  );
}
