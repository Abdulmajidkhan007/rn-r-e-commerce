// Option 1: shared package – single source of truth for both web (Vite) and
// mobile (Metro). Content lives in plain .ts template-literal files to avoid
// the `?raw` Vite-only import syntax that Metro cannot handle.

export type LegalDocKind = 'privacy' | 'terms';
export type LegalLocale = 'uz' | 'en' | 'ru';

import privacyUz from './content/privacy.uz';
import privacyEn from './content/privacy.en';
import privacyRu from './content/privacy.ru';
import termsUz from './content/terms.uz';
import termsEn from './content/terms.en';
import termsRu from './content/terms.ru';

const docs: Record<LegalDocKind, Record<LegalLocale, string>> = {
  privacy: { uz: privacyUz, en: privacyEn, ru: privacyRu },
  terms: { uz: termsUz, en: termsEn, ru: termsRu },
};

export function getLegalDoc(kind: LegalDocKind, locale: LegalLocale): string {
  return docs[kind][locale];
}

export const LEGAL_LAST_UPDATED = '2026-06-27' as const;
