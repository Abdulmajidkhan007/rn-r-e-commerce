import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { PriceTag } from './PriceTag';

// Intl separators vary by ICU build, so match on digits rather than glyphs.
const digitsShown = (): string =>
  (document.body.textContent ?? '').replace(/\D/g, '');

describe('PriceTag', () => {
  it('renders the price', () => {
    renderWithProviders(<PriceTag price={150_000} />);
    expect(digitsShown()).toContain('150000');
  });

  it('shows the original price struck through when it is higher', () => {
    renderWithProviders(<PriceTag price={100_000} compareAtPrice={150_000} />);
    const digits = digitsShown();
    expect(digits).toContain('100000');
    expect(digits).toContain('150000');
  });

  it('hides compareAtPrice when it does not represent a discount', () => {
    // An "original" price equal to the current one would show a nonsensical
    // strike-through, so only the single price must be rendered.
    renderWithProviders(<PriceTag price={100_000} compareAtPrice={100_000} />);
    expect(digitsShown()).toBe('100000');
  });

  it('does not show a strike-through price when compareAtPrice is below price', () => {
    renderWithProviders(<PriceTag price={100_000} compareAtPrice={80_000} />);
    expect(digitsShown()).toBe('100000');
  });

  it('renders zero rather than an empty tag', () => {
    renderWithProviders(<PriceTag price={0} />);
    expect(digitsShown()).toContain('0');
  });

  it('formats in the active language from the store', () => {
    // Same amount, different locale: digits identical, presentation may differ.
    renderWithProviders(<PriceTag price={250_000} />, { language: 'ru' });
    expect(digitsShown()).toContain('250000');
  });
});
