import { useEffect, useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  DEFAULT_TV_SETTINGS,
  selectTvSlides,
  type AppSettings,
  type Product,
  type TvSettings,
  type TvSlide,
} from '@kidswear/core';
import {
  getAppSettings,
  saveMinVersionCode,
  saveTvSettings,
  subscribeProducts,
  subscribeTvSettings,
} from '@kidswear/firebase';

export const appKeys = { settings: ['settings', 'app'] as const };

/** Release info for the Android update banner; re-read every 30 minutes. */
export function useAppSettings(): UseQueryResult<AppSettings | null> {
  return useQuery({
    queryKey: appKeys.settings,
    queryFn: getAppSettings,
    staleTime: 30 * 60 * 1000,
  });
}

/** Admin: set the minimum supported versionCode (null clears it). */
export function useSaveMinVersion(): UseMutationResult<void, Error, number | null> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMinVersionCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: appKeys.settings }),
  });
}

/** Live TV settings: `undefined` until the first snapshot, then settings or the defaults. */
export function useTvSettings(): TvSettings | undefined {
  const [settings, setSettings] = useState<TvSettings | undefined>(undefined);
  useEffect(() => subscribeTvSettings((value) => setSettings(value ?? DEFAULT_TV_SETTINGS)), []);
  return settings;
}

export function useSaveTvSettings(): UseMutationResult<void, Error, TvSettings> {
  return useMutation({ mutationFn: saveTvSettings });
}

/**
 * Live slides for the store TV. Only the public whitelist (`TvSlide`) leaves
 * this hook; products arrive and update in real time through onSnapshot.
 */
export function useTvSlides(settings: TvSettings | undefined): TvSlide[] | undefined {
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  useEffect(() => subscribeProducts({ isActive: true }, setProducts), []);
  return useMemo(
    () => (products && settings ? selectTvSlides(products, settings) : undefined),
    [products, settings],
  );
}
