/**
 * Motion tokens — duration + easing — shared by web (MUI transitions / CSS) and
 * mobile (Paper animations). Keep curves Material-aligned but slightly slower
 * so interactions feel deliberate rather than snappy.
 */
export const durations = {
  fast: 120,
  normal: 220,
  slow: 360,
} as const;

export type DurationToken = keyof typeof durations;

/** CSS cubic-bezier strings — usable by both platforms (Reanimated parses them too). */
export const easings = {
  standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  accelerate: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
  emphasized: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
} as const;

export type EasingToken = keyof typeof easings;
