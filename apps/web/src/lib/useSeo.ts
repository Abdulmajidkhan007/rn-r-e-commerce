import { useEffect } from 'react';
import { serializeJsonLd, type JsonLd } from '@kidswear/utils';

export interface SeoOptions {
  /** Page title without the brand suffix; empty = just "KidsWear". */
  title: string;
  description?: string | undefined;
  /** Absolute or root-relative image for Open Graph / Twitter cards. */
  image?: string | undefined;
  /** `og:type`; defaults to "website". */
  ogType?: 'website' | 'article' | 'product';
  /** Keeps private/transactional pages out of search results. */
  noindex?: boolean;
  /** Structured data, rendered as `<script type="application/ld+json">`. */
  jsonLd?: readonly JsonLd[] | undefined;
}

const JSON_LD_ATTR = 'data-seo-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const created = el === null;
  const previous = el?.content ?? null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
  return () => {
    if (!el) return;
    if (created) el.remove();
    else if (previous !== null) el.content = previous;
  };
}

function upsertCanonical(href: string): () => void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = el === null;
  const previous = el?.href ?? null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
  return () => {
    if (!el) return;
    if (created) el.remove();
    else if (previous !== null) el.href = previous;
  };
}

/** Root-relative image paths become absolute so social crawlers can fetch them. */
function absolute(origin: string, url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Sets title, description, canonical, Open Graph / Twitter tags, robots and
 * JSON-LD for the current page, and restores the previous values on unmount.
 * (Client-side only: crawlers that run JS — Google, Bing — see these tags.)
 */
export function useSeo({
  title,
  description,
  image,
  ogType = 'website',
  noindex = false,
  jsonLd,
}: SeoOptions): void {
  const jsonLdKey = jsonLd ? jsonLd.map(serializeJsonLd).join('\n') : '';

  useEffect(() => {
    const origin = window.location.origin;
    const fullTitle = title ? `${title} — KidsWear` : 'KidsWear';
    const previousTitle = document.title;
    document.title = fullTitle;

    const undo: (() => void)[] = [];
    undo.push(upsertCanonical(`${origin}${window.location.pathname}`));
    undo.push(upsertMeta('property', 'og:title', fullTitle));
    undo.push(upsertMeta('name', 'twitter:title', fullTitle));
    undo.push(upsertMeta('property', 'og:type', ogType));
    undo.push(upsertMeta('property', 'og:url', `${origin}${window.location.pathname}`));
    if (description) {
      undo.push(upsertMeta('name', 'description', description));
      undo.push(upsertMeta('property', 'og:description', description));
      undo.push(upsertMeta('name', 'twitter:description', description));
    }
    if (image) {
      const abs = absolute(origin, image);
      undo.push(upsertMeta('property', 'og:image', abs));
      undo.push(upsertMeta('name', 'twitter:image', abs));
    }
    if (noindex) undo.push(upsertMeta('name', 'robots', 'noindex, nofollow'));

    const scripts = jsonLdKey
      ? jsonLdKey.split('\n').map((body) => {
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.setAttribute(JSON_LD_ATTR, '');
          script.textContent = body;
          document.head.appendChild(script);
          return script;
        })
      : [];

    return () => {
      document.title = previousTitle;
      undo.forEach((fn) => {
        fn();
      });
      scripts.forEach((s) => {
        s.remove();
      });
    };
  }, [title, description, image, ogType, noindex, jsonLdKey]);
}

/** Only adds `noindex` (leaves title/canonical to the page) — for whole layouts. */
export function useNoIndex(): void {
  useEffect(() => upsertMeta('name', 'robots', 'noindex, nofollow'), []);
}
