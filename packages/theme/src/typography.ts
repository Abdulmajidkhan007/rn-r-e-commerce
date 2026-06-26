/** Typographic tokens: font sizes, weights, and line heights. */
export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export type FontSizeToken = keyof typeof fontSizes;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export type FontWeightToken = keyof typeof fontWeights;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export type LineHeightToken = keyof typeof lineHeights;

/** Default font family stacks. Mobile may override with a bundled font later. */
export const fontFamilies = {
  sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
  system:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;
