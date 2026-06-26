/**
 * KidsWear palette — friendly, soft, Material-aligned.
 *
 * Primary is a warm coral/peach; secondary a calm teal. Each brand and neutral
 * color is exposed as a 50–900 tonal scale so both MUI and Paper can derive
 * their Material themes, and Tailwind/NativeWind can map them to utilities.
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

const primary: ColorScale = {
  50: '#fff1ee',
  100: '#ffe0d8',
  200: '#ffc1b1',
  300: '#ff9c83',
  400: '#ff7a5c',
  500: '#ff5a3c',
  600: '#e8472c',
  700: '#c13a25',
  800: '#9a3220',
  900: '#7c2d1f',
};

const secondary: ColorScale = {
  50: '#eafaf7',
  100: '#c9f1e9',
  200: '#97e3d6',
  300: '#5fcfbe',
  400: '#34b8a6',
  500: '#1aa18f',
  600: '#118173',
  700: '#10675d',
  800: '#11524b',
  900: '#11443f',
};

const success: ColorScale = {
  50: '#eefbf2',
  100: '#d3f5dd',
  200: '#a9eabf',
  300: '#73d99a',
  400: '#41c275',
  500: '#22a85b',
  600: '#168749',
  700: '#146b3c',
  800: '#135532',
  900: '#10462b',
};

const error: ColorScale = {
  50: '#fef2f2',
  100: '#fde1e1',
  200: '#fbc8c8',
  300: '#f7a3a3',
  400: '#f06f6f',
  500: '#e54545',
  600: '#cf2c2c',
  700: '#ad2121',
  800: '#8f2020',
  900: '#771f1f',
};

const warning: ColorScale = {
  50: '#fff8eb',
  100: '#ffeac6',
  200: '#ffd388',
  300: '#ffba4d',
  400: '#ffa31f',
  500: '#f98906',
  600: '#dd6802',
  700: '#b74906',
  800: '#94390c',
  900: '#7a300d',
};

const neutral: ColorScale = {
  50: '#f8f9fa',
  100: '#f1f3f5',
  200: '#e9ecef',
  300: '#dee2e6',
  400: '#ced4da',
  500: '#adb5bd',
  600: '#868e96',
  700: '#495057',
  800: '#343a40',
  900: '#212529',
};

export const palette = {
  primary,
  secondary,
  success,
  error,
  warning,
  neutral,
} as const;

/** Semantic, theme-resolved colors for light and dark schemes. */
export const semanticColors = {
  light: {
    primary: primary[500],
    onPrimary: '#ffffff',
    secondary: secondary[500],
    onSecondary: '#ffffff',
    success: success[500],
    error: error[500],
    warning: warning[500],
    background: '#fffaf8',
    surface: '#ffffff',
    surfaceVariant: neutral[100],
    border: neutral[200],
    text: neutral[900],
    textMuted: neutral[600],
  },
  dark: {
    primary: primary[400],
    onPrimary: '#3a1207',
    secondary: secondary[300],
    onSecondary: '#06241f',
    success: success[400],
    error: error[400],
    warning: warning[400],
    background: '#1a1614',
    surface: '#241f1d',
    surfaceVariant: '#332b28',
    border: '#3d3431',
    text: '#f7f3f1',
    textMuted: '#b5aca8',
  },
} as const;

export type ColorScheme = keyof typeof semanticColors;
export type SemanticColors = (typeof semanticColors)[ColorScheme];
