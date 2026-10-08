/**
 * Soft elevation tokens — used for cards, popovers, and the sticky chrome.
 * Each level is a single CSS box-shadow string; mobile reads only the level
 * numbers (Paper's `elevation` prop) so the shadow string is web-only.
 */
export const elevations = {
  none: { level: 0, shadow: 'none' },
  sm: {
    level: 1,
    shadow: '0 1px 2px rgba(20, 20, 20, 0.04), 0 1px 3px rgba(20, 20, 20, 0.06)',
  },
  md: {
    level: 2,
    shadow: '0 4px 12px rgba(20, 20, 20, 0.06), 0 2px 4px rgba(20, 20, 20, 0.04)',
  },
  lg: {
    level: 3,
    shadow: '0 10px 24px rgba(20, 20, 20, 0.08), 0 4px 8px rgba(20, 20, 20, 0.04)',
  },
  xl: {
    level: 4,
    shadow: '0 24px 48px rgba(20, 20, 20, 0.10), 0 8px 16px rgba(20, 20, 20, 0.06)',
  },
} as const;

export type ElevationToken = keyof typeof elevations;
