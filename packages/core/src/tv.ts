import { z } from 'zod';
import type { Product } from './product';
import type { LocalizedText } from './localized';

export const TV_SOURCES = ['new', 'sale', 'category'] as const;
export const TvSourceSchema = z.enum(TV_SOURCES);
export type TvSource = z.infer<typeof TvSourceSchema>;

export const TV_MIN_SECONDS = 3;
export const TV_MAX_SECONDS = 60;
export const TV_MAX_SLIDES = 30;

/** settings/tv — public read, admin write. */
export const TvSettingsSchema = z.object({
  /** new = latest products, sale = discounted ones, category = one category. */
  source: TvSourceSchema,
  /** Required when `source` is "category". */
  categoryId: z.string().min(1).optional(),
  /** Seconds each slide stays on screen. */
  slideSeconds: z.number().int().min(TV_MIN_SECONDS).max(TV_MAX_SECONDS),
});
export type TvSettings = z.infer<typeof TvSettingsSchema>;

export const DEFAULT_TV_SETTINGS: TvSettings = { source: 'new', slideSeconds: 8 };

/**
 * The only product fields the TV screen ever reads. The page is public, so the
 * slide is built from this whitelist rather than passing a Product around:
 * a field added to Product later cannot reach the TV by accident.
 */
export interface TvSlide {
  id: string;
  name: LocalizedText;
  price: number;
  compareAtPrice: number | undefined;
  image: string | undefined;
}

export function toTvSlide(product: Product): TvSlide {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    compareAtPrice:
      product.compareAtPrice !== undefined && product.compareAtPrice > product.price
        ? product.compareAtPrice
        : undefined,
    image: product.images[0],
  };
}

/** Picks and orders what the TV shows: visible, in stock, newest first. */
export function selectTvSlides(products: readonly Product[], settings: TvSettings): TvSlide[] {
  return products
    .filter(
      (p) =>
        p.isActive &&
        p.isDraft !== true &&
        p.deletedAt === undefined &&
        p.stock > 0 &&
        (settings.source !== 'sale' || (p.compareAtPrice ?? 0) > p.price) &&
        (settings.source !== 'category' || p.categoryId === settings.categoryId),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, TV_MAX_SLIDES)
    .map(toTvSlide);
}

/** Index of the slide after `current` (wraps; 0 when the list is empty/shrank). */
export function nextSlideIndex(current: number, count: number): number {
  return count <= 0 ? 0 : (current + 1) % count;
}
