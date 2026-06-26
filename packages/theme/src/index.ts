/**
 * @kidswear/theme — pure-TS design tokens.
 *
 * No platform imports. Web maps these to MUI `createTheme` + Tailwind;
 * mobile maps them to React Native Paper (MD3) + NativeWind.
 */
export * from './colors';
export * from './spacing';
export * from './typography';

import { palette, semanticColors } from './colors';
import { spacing, radii } from './spacing';
import { fontSizes, fontWeights, lineHeights, fontFamilies } from './typography';

/** Single aggregated token object, convenient for theme adapters. */
export const tokens = {
  palette,
  semanticColors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
  fontFamilies,
} as const;

export type Tokens = typeof tokens;
