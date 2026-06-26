import { IconButton } from 'react-native-paper';
import { useAppDispatch, useAppSelector, toggleTheme } from '@kidswear/store';

/** Toggles between light and dark, persisted via uiSlice. */
export function ThemeToggle(): React.ReactElement {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const isDark = theme === 'dark';

  return (
    <IconButton
      icon={isDark ? 'white-balance-sunny' : 'weather-night'}
      onPress={() => dispatch(toggleTheme())}
      accessibilityLabel="toggle theme"
    />
  );
}
