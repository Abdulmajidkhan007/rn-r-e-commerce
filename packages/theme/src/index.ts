/**
 * @kidswear/theme — pure-TS design tokens.
 *
 * No platform imports. Web maps these to MUI `createTheme` + Tailwind;
 * mobile maps them to React Native Paper (MD3) + NativeWind.
 */
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './motion';
export * from './elevation';

import { palette, semanticColors } from './colors';
import { spacing, radii } from './spacing';
import {
  fontSizes,
  fontWeights,
  lineHeights,
  fontFamilies,
  letterSpacings,
} from './typography';
import { durations, easings } from './motion';
import { elevations } from './elevation';

/** Single aggregated token object, convenient for theme adapters. */
export const tokens = {
  palette,
  semanticColors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  fontFamilies,
  durations,
  easings,
  elevations,
} as const;

export type Tokens = typeof tokens;
