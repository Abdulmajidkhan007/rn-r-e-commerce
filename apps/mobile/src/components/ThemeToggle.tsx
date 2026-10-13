import { IconButton, useTheme } from 'react-native-paper';
import { useAppDispatch, setTheme } from '@kidswear/store';
import { useTranslation } from '@kidswear/i18n';

/**
 * Flips between light and dark based on what is on screen now, so the first
 * tap works even while the preference is still "system".
 */
export function ThemeToggle(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { dark } = useTheme();

  return (
    <IconButton
      icon={dark ? 'white-balance-sunny' : 'weather-night'}
      onPress={() => dispatch(setTheme(dark ? 'light' : 'dark'))}
      accessibilityLabel={t('settings.toggleTheme')}
    />
  );
}
