import { createTheme, type Theme } from '@mui/material/styles';
import { tokens } from '@kidswear/theme';

/**
 * Maps the shared design tokens onto an MUI theme for a given color scheme.
 * Both platforms derive their Material theme from the same tokens, so web (MUI)
 * and mobile (Paper) stay visually consistent.
 */
export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const c = tokens.semanticColors[mode];
  const { palette, radii, fontFamilies, fontSizes, fontWeights, durations, easings, elevations } =
    tokens;

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
    shape: { borderRadius: radii.md },
    transitions: {
      duration: {
        shortest: durations.fast,
        shorter: durations.fast,
        short: durations.fast,
        standard: durations.normal,
        complex: durations.slow,
        enteringScreen: durations.normal,
        leavingScreen: durations.fast,
      },
      easing: {
        easeInOut: easings.standard,
        easeOut: easings.decelerate,
        easeIn: easings.accelerate,
        sharp: easings.emphasized,
      },
    },
    typography: {
      fontFamily: fontFamilies.sans,
      fontSize: fontSizes.md,
      button: { textTransform: 'none', fontWeight: Number(fontWeights.semibold) },
      h1: {
        fontWeight: Number(fontWeights.extrabold),
        fontSize: fontSizes['5xl'],
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: Number(fontWeights.bold),
        fontSize: fontSizes['4xl'],
        lineHeight: 1.15,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: Number(fontWeights.bold),
        fontSize: fontSizes['3xl'],
        lineHeight: 1.2,
      },
      h4: { fontWeight: Number(fontWeights.semibold), fontSize: fontSizes['2xl'] },
      h5: { fontWeight: Number(fontWeights.semibold), fontSize: fontSizes.xl },
      h6: { fontWeight: Number(fontWeights.semibold), fontSize: fontSizes.lg },
      subtitle1: { fontWeight: Number(fontWeights.semibold) },
      subtitle2: { fontWeight: Number(fontWeights.medium) },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.6 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radii.full,
            paddingInline: 20,
            paddingBlock: 10,
            fontWeight: Number(fontWeights.semibold),
          },
          contained: { boxShadow: elevations.sm.shadow },
          sizeLarge: { paddingInline: 28, paddingBlock: 14, fontSize: fontSizes.md },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: radii.xl,
            border: `1px solid ${c.border}`,
            boxShadow: elevations.sm.shadow,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: { backdropFilter: 'saturate(180%) blur(12px)' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          rounded: { borderRadius: radii.lg },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: radii.lg },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: radii.full, fontWeight: Number(fontWeights.medium) },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: radii.md, fontSize: fontSizes.xs },
        },
      },
    },
  });
}
