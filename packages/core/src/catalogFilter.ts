import { isStorefrontVisible } from './catalog';
import type { Gender, Product } from './product';

/**
 * Catalog filters shared by web and mobile (through `useProducts`).
 *
 * Firestore resolves what it can index — category, gender, ONE array-contains
 * (search token or size), sort — and these pure functions finish the job on the
 * loaded pages: price range and age (two inequality ranges on different fields
 * cannot share one Firestore query), and the size when a search token already
 * took the query's single array-contains.
 */

export interface CatalogFilters {
  /** Exact size label, e.g. "98" or "M". */
  size?: string | undefined;
  /** Matches products for that gender plus the unisex ones. */
  gender?: Gender | undefined;
  /** Key of an entry in `AGE_BANDS`. */
  ageBand?: string | undefined;
  /** Inclusive price bounds in som. */
  priceMin?: number | undefined;
  priceMax?: number | undefined;
}

/** Age bands offered in the UI, in months, inclusive of both ends. */
export const AGE_BANDS = [
  { key: '0-1', fromMonths: 0, toMonths: 11 },
  { key: '1-3', fromMonths: 12, toMonths: 35 },
  { key: '3-6', fromMonths: 36, toMonths: 71 },
  { key: '6-9', fromMonths: 72, toMonths: 107 },
  { key: '9-12', fromMonths: 108, toMonths: 143 },
  { key: '12+', fromMonths: 144, toMonths: 240 },
] as const;

export function ageBandByKey(key: string | undefined): (typeof AGE_BANDS)[number] | undefined {
  return AGE_BANDS.find((band) => band.key === key);
}

/** Genders whose products show up under a gender filter: that gender and unisex. */
export function gendersFor(gender: Gender): Gender[] {
  return gender === 'unisex' ? ['unisex'] : [gender, 'unisex'];
}

/** True when any client-side part of the filters is set (so pages may need topping up). */
export function hasClientFilters(filters: CatalogFilters, searching: boolean): boolean {
  return (
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.ageBand !== undefined ||
    (searching && filters.size !== undefined)
  );
}

/** True when a product's age range overlaps the band. Unknown age never matches. */
export function matchesAgeBand(
  product: Pick<Product, 'ageFromMonths' | 'ageToMonths'>,
  bandKey: string,
): boolean {
  const band = ageBandByKey(bandKey);
  if (!band) return true;
  const { ageFromMonths: from, ageToMonths: to } = product;
  if (from === undefined && to === undefined) return false;
  const lo = from ?? 0;
  const hi = to ?? Number.POSITIVE_INFINITY;
  return lo <= band.toMonths && hi >= band.fromMonths;
}

/** Every filter, applied in memory — the reference semantics for the Firestore + client split. */
export function matchesFilters(product: Product, filters: CatalogFilters): boolean {
  if (filters.size !== undefined && !product.sizes.includes(filters.size)) return false;
  if (filters.gender !== undefined) {
    if (!product.gender || !gendersFor(filters.gender).includes(product.gender)) return false;
  }
  if (filters.ageBand !== undefined && !matchesAgeBand(product, filters.ageBand)) return false;
  if (filters.priceMin !== undefined && product.price < filters.priceMin) return false;
  if (filters.priceMax !== undefined && product.price > filters.priceMax) return false;
  return true;
}

export function filterProducts(products: Product[], filters: CatalogFilters): Product[] {
  return products.filter((p) => matchesFilters(p, filters));
}

/** The part Firestore did not apply: price, age, and size when a search token was used. */
export function applyClientFilters(
  products: Product[],
  filters: CatalogFilters,
  searching: boolean,
): Product[] {
  const { priceMin, priceMax, ageBand, size } = filters;
  return filterProducts(products, { priceMin, priceMax, ageBand, ...(searching ? { size } : {}) });
}

/** Distinct sizes across products, small-to-large where sizes are numeric, else alphabetical. */
export function collectSizes(products: Pick<Product, 'sizes'>[]): string[] {
  const all = new Set(products.flatMap((p) => p.sizes));
  return [...all].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Category ids that have at least one storefront-visible product. */
export function categoryIdsWithProducts(
  products: Pick<Product, 'categoryId' | 'isActive' | 'isDraft' | 'deletedAt'>[],
): Set<string> {
  return new Set(products.filter(isStorefrontVisible).map((p) => p.categoryId));
}

function ageMid(p: Pick<Product, 'ageFromMonths' | 'ageToMonths'>): number | null {
  if (p.ageFromMonths === undefined && p.ageToMonths === undefined) return null;
  const from = p.ageFromMonths ?? p.ageToMonths ?? 0;
  const to = p.ageToMonths ?? from;
  return (from + to) / 2;
}

/**
 * "O'xshashlar": other storefront-visible products ranked by how alike they are —
 * same category first (it dominates), then matching gender, close age, close price.
 * Ties break on newest. Deterministic and pure so it is testable.
 */
export function pickSimilar(product: Product, candidates: Product[], limit = 8): Product[] {
  const mid = ageMid(product);
  const scored = candidates
    .filter((c) => c.id !== product.id && isStorefrontVisible(c))
    .map((c) => {
      let score = 0;
      if (c.categoryId === product.categoryId) score += 100;
      if (product.gender && c.gender) {
        if (c.gender === product.gender) score += 20;
        else if (c.gender === 'unisex' || product.gender === 'unisex') score += 10;
      }
      const cMid = ageMid(c);
      if (mid !== null && cMid !== null) {
        const years = Math.abs(mid - cMid) / 12;
        score += Math.max(0, 20 - years * 10);
      }
      if (product.price > 0) {
        const ratio = Math.abs(c.price - product.price) / product.price;
        score += Math.max(0, 20 - ratio * 20);
      }
      return { c, score };
    })
    .sort(
      (a, b) => b.score - a.score || b.c.createdAt - a.c.createdAt || a.c.id.localeCompare(b.c.id),
    );
  return scored.slice(0, limit).map((s) => s.c);
}
