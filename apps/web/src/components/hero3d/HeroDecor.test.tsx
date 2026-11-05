import { createRef } from 'react';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/renderWithProviders';
import { HeroDecor } from './HeroDecor';

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

describe('HeroDecor', () => {
  let fireIntersection: ObserverCallback = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.IntersectionObserver = class {
      constructor(callback: ObserverCallback) {
        fireIntersection = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof IntersectionObserver;
    // jsdom has no WebGL: the capability probe must see "unsupported".
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the static, aria-hidden decor before anything loads', () => {
    const { container, getByTestId } = renderWithProviders(
      <HeroDecor eventSource={createRef<HTMLElement>()} />,
    );
    const root = container.querySelector('[data-decor-mode]');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveAttribute('data-decor-mode', 'static');
    expect(getByTestId('hero-decor-static')).toBeInTheDocument();
  });

  it('stays static without WebGL once the hero becomes visible', async () => {
    const { container } = renderWithProviders(<HeroDecor eventSource={createRef<HTMLElement>()} />);
    act(() => fireIntersection([{ isIntersecting: true }]));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    expect(container.querySelector('[data-decor-mode]')).toHaveAttribute(
      'data-decor-mode',
      'static',
    );
    expect(container.querySelector('canvas')).toBeNull();
  });
});
