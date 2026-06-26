import { useEffect, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { PaperProvider } from 'react-native-paper';
import { useAppSelector } from '@kidswear/store';
import { paperDarkTheme, paperLightTheme } from './paperTheme';

/**
 * Resolves the persisted `ui.theme` preference to a concrete scheme and applies
 * it to both React Native Paper and NativeWind (Tailwind colorScheme).
 */
export function AppThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const preference = useAppSelector((s) => s.ui.theme);
  const systemScheme = useRNColorScheme() ?? 'light';
  const { setColorScheme } = useNativewindColorScheme();

  const resolved = preference === 'system' ? systemScheme : preference;

  useEffect(() => {
    setColorScheme(preference);
  }, [preference, setColorScheme]);

  const theme = resolved === 'dark' ? paperDarkTheme : paperLightTheme;

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
