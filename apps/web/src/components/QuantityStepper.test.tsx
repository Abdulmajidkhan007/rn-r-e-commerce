import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
  it('shows the current value', () => {
    renderWithProviders(<QuantityStepper value={3} onChange={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('reports the incremented value', async () => {
    const onChange = vi.fn();
    renderWithProviders(<QuantityStepper value={3} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('increase'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('reports the decremented value', async () => {
    const onChange = vi.fn();
    renderWithProviders(<QuantityStepper value={3} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('decrease'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables decrement at the minimum so quantity cannot reach zero', async () => {
    const onChange = vi.fn();
    renderWithProviders(<QuantityStepper value={1} onChange={onChange} />);
    const decrease = screen.getByLabelText('decrease');
    expect(decrease).toBeDisabled();
    await userEvent.click(decrease);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables increment at the maximum', async () => {
    const onChange = vi.fn();
    renderWithProviders(<QuantityStepper value={5} max={5} onChange={onChange} />);
    const increase = screen.getByLabelText('increase');
    expect(increase).toBeDisabled();
    await userEvent.click(increase);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('honours a custom min', () => {
    renderWithProviders(<QuantityStepper value={2} min={2} onChange={vi.fn()} />);
    expect(screen.getByLabelText('decrease')).toBeDisabled();
  });

  it('clamps rather than overshooting when stock is the max', async () => {
    // Guards against a stale value prop pushing quantity past available stock.
    const onChange = vi.fn();
    renderWithProviders(<QuantityStepper value={7} max={5} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('increase'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
