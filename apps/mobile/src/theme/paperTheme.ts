import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
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
    // Paper's roundness is a scalar multiplier; 4 ≈ 16px on most components.
    roundness: 4,
    colors: {
      ...base.colors,
      primary: palette.primary[mode === 'dark' ? 400 : 500],
      onPrimary: c.onPrimary,
      primaryContainer: palette.primary[mode === 'dark' ? 800 : 100],
      onPrimaryContainer: palette.primary[mode === 'dark' ? 100 : 900],
      secondary: palette.secondary[mode === 'dark' ? 300 : 500],
      onSecondary: c.onSecondary,
      secondaryContainer: palette.secondary[mode === 'dark' ? 800 : 100],
      onSecondaryContainer: palette.secondary[mode === 'dark' ? 100 : 900],
      tertiary: palette.secondary[mode === 'dark' ? 400 : 600],
      error: c.error,
      onError: '#ffffff',
      errorContainer: palette.error[mode === 'dark' ? 800 : 100],
      onErrorContainer: palette.error[mode === 'dark' ? 100 : 900],
      background: c.background,
      onBackground: c.text,
      surface: c.surface,
      surfaceVariant: c.surfaceVariant,
      onSurface: c.text,
      onSurfaceVariant: c.textMuted,
      surfaceDisabled: c.surfaceVariant,
      onSurfaceDisabled: c.textMuted,
      outline: c.border,
      outlineVariant: c.border,
      inverseSurface: mode === 'dark' ? c.surface : palette.neutral[800],
      inverseOnSurface: mode === 'dark' ? c.text : '#ffffff',
      inversePrimary: palette.primary[mode === 'dark' ? 500 : 300],
    },
  };
}

export const paperLightTheme = buildTheme(MD3LightTheme, 'light');
export const paperDarkTheme = buildTheme(MD3DarkTheme, 'dark');
