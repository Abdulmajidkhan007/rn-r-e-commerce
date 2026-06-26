import { createTheme, type Theme } from '@mui/material/styles';
import { tokens } from '@kidswear/theme';

/**
 * Maps the shared design tokens onto an MUI theme for a given color scheme.
 * Both platforms derive their Material theme from the same tokens, so web (MUI)
 * and mobile (Paper) stay visually consistent.
 */
export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const c = tokens.semanticColors[mode];
  const { palette, radii, fontFamilies, fontSizes, fontWeights } = tokens;

  return createTheme({
    palette: {
      mode,
      primary: { main: palette.primary[500], contrastText: c.onPrimary },
      secondary: { main: palette.secondary[500], contrastText: c.onSecondary },
      success: { main: palette.success[500] },
      error: { main: palette.error[500] },
      warning: { main: palette.warning[500] },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.text, secondary: c.textMuted },
      divider: c.border,
    },
    shape: {
      borderRadius: radii.md,
    },
    typography: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.md,
      button: { textTransform: 'none', fontWeight: Number(fontWeights.semibold) },
      h1: { fontWeight: Number(fontWeights.bold) },
      h2: { fontWeight: Number(fontWeights.bold) },
      h3: { fontWeight: Number(fontWeights.semibold) },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radii.lg },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: radii.lg },
        },
      },
    },
  });
}
