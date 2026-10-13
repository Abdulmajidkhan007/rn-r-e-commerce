import { SegmentedButtons } from 'react-native-paper';
import { useAppDispatch, useAppSelector, setTheme, type ThemePreference } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';

/** System / light / dark picker for settings, persisted via uiSlice. */
export function ThemeModePicker(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  return (
    <SegmentedButtons
      value={theme}
      onValueChange={(value) => dispatch(setTheme(value as ThemePreference))}
      buttons={[
        { value: 'system', label: t('settings.themeSystem'), icon: 'theme-light-dark' },
        { value: 'light', label: t('settings.themeLight'), icon: 'white-balance-sunny' },
        { value: 'dark', label: t('settings.themeDark'), icon: 'weather-night' },
      ]}
    />
  );
}
