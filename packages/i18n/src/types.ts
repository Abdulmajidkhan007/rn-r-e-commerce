import type { defaultNS, resources } from './resources';

/**
 * Type-safe translation keys: augments react-i18next with our resource shape
 * so `t('nav.home')` is checked against the uz baseline.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['uz'];
  }
}
