import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSeo } from './useSeo';

const meta = (sel: string): string | null =>
  document.head.querySelector<HTMLMetaElement>(sel)?.content ?? null;

describe('useSeo', () => {
  it('sets title, description, canonical, OG and JSON-LD, then cleans up', () => {
    const { unmount } = renderHook(() =>
      useSeo({
        title: 'Kurtka',
        description: 'Issiq kurtka',
        image: '/img.png',
        ogType: 'product',
        jsonLd: [{ '@type': 'Product', name: 'a</script>' }],
      }),
    );
    expect(document.title).toBe('Kurtka — KidsWear');
    expect(meta('meta[name="description"]')).toBe('Issiq kurtka');
    expect(meta('meta[property="og:title"]')).toBe('Kurtka — KidsWear');
    expect(meta('meta[property="og:type"]')).toBe('product');
    expect(meta('meta[property="og:image"]')).toBe(`${window.location.origin}/img.png`);
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      `${window.location.origin}/`,
    );
    const ld = document.head.querySelector('script[type="application/ld+json"]');
    expect(ld?.textContent).not.toContain('</script>');
    expect(JSON.parse(ld?.textContent ?? '{}')).toMatchObject({ '@type': 'Product' });

    unmount();
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(meta('meta[name="description"]')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('adds noindex only when asked', () => {
    const { unmount } = renderHook(() => useSeo({ title: 'Savat', noindex: true }));
    expect(meta('meta[name="robots"]')).toBe('noindex, nofollow');
    unmount();
    expect(meta('meta[name="robots"]')).toBeNull();
  });
});
