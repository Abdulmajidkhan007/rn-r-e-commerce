import { describe, expect, it } from 'vitest';
import { LOW_STOCK_THRESHOLD, stockStatus } from './stock';

describe('stockStatus', () => {
  it('reports out at zero', () => {
    expect(stockStatus(0)).toBe('out');
  });

  it('reports out for negative stock rather than throwing', () => {
    // Stock should never go negative, but a race in the Functions decrement
    // could produce it — a badge must still render.
    expect(stockStatus(-3)).toBe('out');
  });

  it('treats the threshold itself as low, not in-stock', () => {
    expect(stockStatus(LOW_STOCK_THRESHOLD)).toBe('low');
    expect(stockStatus(LOW_STOCK_THRESHOLD + 1)).toBe('in');
  });

  it('reports low just above zero', () => {
    expect(stockStatus(1)).toBe('low');
  });
});
