import { pickLocalized, type LocalizedLike } from '@kidswear/utils';
import { useAppSelector } from '@kidswear/store';

/** Returns a function that resolves LocalizedText for the active UI language. */
export function useLocalized(): (text: LocalizedLike) => string {
  const language = useAppSelector((s) => s.ui.language);
  return (text: LocalizedLike) => pickLocalized(text, language);
}
