import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { OrderStatus } from '@kidswear/core';
import { renderWithProviders } from '@/test/renderWithProviders';
import { OrderStatusChip } from './OrderStatusChip';

const ALL: readonly OrderStatus[] = [
  'pending',
  'deposit_paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

describe('OrderStatusChip', () => {
  it.each(ALL)('renders a translated label for %s', (status) => {
    renderWithProviders(<OrderStatusChip status={status} />);
    const label = document.body.textContent ?? '';
    // A missing translation surfaces as the raw key — that must never ship.
    expect(label.trim()).not.toBe('');
    expect(label).not.toContain('orderStatus.');
  });

  it('translates into the active language', () => {
    renderWithProviders(<OrderStatusChip status="delivered" />, { language: 'en' });
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('gives cancelled a distinct label from delivered', () => {
    const { unmount } = renderWithProviders(<OrderStatusChip status="delivered" />, {
      language: 'en',
    });
    const delivered = document.body.textContent;
    unmount();

    renderWithProviders(<OrderStatusChip status="cancelled" />, { language: 'en' });
    expect(document.body.textContent).not.toBe(delivered);
  });
});
