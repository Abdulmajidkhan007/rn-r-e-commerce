import { SegmentedButtons } from 'react-native-paper';
import { useAppDispatch, useAppSelector, setLanguage } from '@kidswear/store';
import { supportedLanguages, type SupportedLanguage } from '@kidswear/i18n';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  uz: 'UZ',
  en: 'EN',
  ru: 'RU',
};

/** Full-width language picker for settings, persisted via uiSlice. */
export function LanguageSwitcher(): React.ReactElement {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.ui.language);

  return (
    <SegmentedButtons
      value={language}
      onValueChange={(value) => dispatch(setLanguage(value as SupportedLanguage))}
      buttons={supportedLanguages.map((lng) => ({ value: lng, label: LANGUAGE_LABELS[lng] }))}
    />
  );
}
