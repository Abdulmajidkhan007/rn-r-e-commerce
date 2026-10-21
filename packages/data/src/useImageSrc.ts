import { useQuery } from '@tanstack/react-query';
import { getInlineImage } from '@kidswear/firebase';
import { parseInlineImageRef } from '@kidswear/utils';

export interface ImageSrcState {
  /** Something an <img>/<Image> can load, or undefined while loading / when absent. */
  uri: string | undefined;
  isLoading: boolean;
  /** No image to show: empty, unreadable, or a ref whose document is gone. */
  isMissing: boolean;
}

/**
 * Turns a stored product image (`https://…` or `kwimg:<id>`) into a loadable
 * URI. Inline images are immutable — each upload gets a fresh id — so they are
 * cached for the whole session.
 */
export function useImageSrc(src: string | undefined): ImageSrcState {
  const inlineId = src ? parseInlineImageRef(src) : null;
  const query = useQuery({
    queryKey: ['productImage', inlineId] as const,
    queryFn: () => getInlineImage(src ?? ''),
    enabled: inlineId !== null,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  if (!src) return { uri: undefined, isLoading: false, isMissing: true };
  if (inlineId === null) return { uri: src, isLoading: false, isMissing: false };
  const uri = query.data ?? undefined;
  return { uri, isLoading: query.isLoading, isMissing: !query.isLoading && !uri };
}
