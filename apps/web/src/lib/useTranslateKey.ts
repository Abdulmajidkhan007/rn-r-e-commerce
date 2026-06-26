import { useTranslation } from '@kidswear/i18n';

/**
 * Returns a translator for runtime (non-literal) i18n keys — e.g. zod validation
 * messages and stored auth error keys, which are typed as `string`. Falls back
 * to the key itself if missing.
 */
export function useTranslateKey(): (key: string) => string {
  const { t } = useTranslation();
  return (key: string): string => t(key, { defaultValue: key });
}
