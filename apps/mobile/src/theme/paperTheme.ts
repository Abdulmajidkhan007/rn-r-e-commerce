import {
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from 'react-native-paper';
import { tokens } from '@kidswear/theme';

/**
 * Maps shared design tokens onto a React Native Paper MD3 theme, mirroring the
 * web MUI theme so both platforms render the same Material product.
 */
function buildTheme(base: MD3Theme, mode: 'light' | 'dark'): MD3Theme {
  const c = tokens.semanticColors[mode];
  const { palette } = tokens;
  return {
    ...base,
    roundness: 2,
    colors: {
      ...base.colors,
      primary: palette.primary[mode === 'dark' ? 400 : 500],
      onPrimary: c.onPrimary,
      primaryContainer: palette.primary[mode === 'dark' ? 800 : 100],
      secondary: palette.secondary[mode === 'dark' ? 300 : 500],
      onSecondary: c.onSecondary,
      secondaryContainer: palette.secondary[mode === 'dark' ? 800 : 100],
      error: c.error,
      background: c.background,
      surface: c.surface,
      surfaceVariant: c.surfaceVariant,
      onSurface: c.text,
      onSurfaceVariant: c.textMuted,
      outline: c.border,
      outlineVariant: c.border,
    },
  };
}

export const paperLightTheme = buildTheme(MD3LightTheme, 'light');
export const paperDarkTheme = buildTheme(MD3DarkTheme, 'dark');
