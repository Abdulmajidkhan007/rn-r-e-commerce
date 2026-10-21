import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, makeQueryClient } from '@kidswear/data';

import { renderWithProviders } from '@/test/renderWithProviders';
import { ProductImage } from './ProductImage';

function renderImage(src: string | undefined): void {
  const client = makeQueryClient();
  renderWithProviders(
    <QueryClientProvider client={client}>
      <ProductImage src={src} alt="Test" sx={{ width: 100, aspectRatio: '4 / 5' }} />
    </QueryClientProvider>,
  );
}

describe('ProductImage', () => {
  it('renders a plain URL as an <img>', () => {
    renderImage('https://picsum.photos/seed/a/800');
    expect(screen.getByRole('img', { name: 'Test' }).tagName).toBe('IMG');
  });

  it('shows the placeholder icon when the product has no photo', () => {
    renderImage(undefined);
    expect(screen.getByRole('img', { name: 'Test' }).tagName.toLowerCase()).toBe('svg');
  });

  it('falls back to the placeholder when an inline photo cannot be loaded', async () => {
    // No Firebase app in tests, so resolving the ref fails — like a deleted doc.
    renderImage('kwimg:missing');
    // The shared client retries once (~1 s) before giving up.
    await waitFor(
      () => expect(screen.getByRole('img', { name: 'Test' }).tagName.toLowerCase()).toBe('svg'),
      { timeout: 4000 },
    );
  });
});
