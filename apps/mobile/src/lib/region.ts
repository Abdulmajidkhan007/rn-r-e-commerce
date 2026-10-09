import { regionName } from '@kidswear/core';
import { pickLocalized } from '@kidswear/utils';
import type { SupportedLanguage } from '@kidswear/i18n';

/**
 * Display name for an address region. New addresses store a region id
 * (UZ_REGIONS); older ones hold free text, which is shown as typed.
 */
export function regionLabel(value: string, language: SupportedLanguage): string {
  const name = regionName(value);
  return name ? pickLocalized(name, language) : value;
}
