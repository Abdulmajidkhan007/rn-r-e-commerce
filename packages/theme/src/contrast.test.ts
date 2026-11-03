import { describe, expect, it } from 'vitest';
import { semanticColors, type ColorScheme } from './colors';
import { contrastRatio } from './contrast';

const AA_TEXT = 4.5;

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#fff', '#fff')).toBe(1);
  });
});

/** Text-on-background pairs the UI actually renders, per scheme. */
function pairs(s: ColorScheme): [string, string, string][] {
  const c = semanticColors[s];
  return [
    ['text on background', c.text, c.background],
    ['text on surface', c.text, c.surface],
    ['text on surfaceVariant', c.text, c.surfaceVariant],
    ['muted text on background', c.textMuted, c.background],
    ['muted text on surface', c.textMuted, c.surface],
    ['muted text on surfaceVariant', c.textMuted, c.surfaceVariant],
    ['onPrimary on primary', c.onPrimary, c.primary],
    ['onSecondary on secondary', c.onSecondary, c.secondary],
    ['primary text on background', c.primary, c.background],
    ['primary text on surface', c.primary, c.surface],
    ['secondary text on surface', c.secondary, c.surface],
    ['error text on surface', c.error, c.surface],
    ['success text on surface', c.success, c.surface],
    ['warning text on surface', c.warning, c.surface],
  ];
}

describe.each(['light', 'dark'] as const)('WCAG AA contrast — %s', (scheme) => {
  it.each(pairs(scheme))('%s', (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
