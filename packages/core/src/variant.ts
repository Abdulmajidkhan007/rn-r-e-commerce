import { z } from 'zod';

/**
 * A sellable size × colour combination of a product. Stock (and optionally
 * price) live here because kids' clothing sells out per size, not per model.
 */
export const ProductVariantSchema = z.object({
  /** Deterministic: `variantIdFor(size, color)`. Stable across edits. */
  id: z.string().min(1),
  /** '' when the product has no sizes. */
  size: z.string(),
  /** '' when the product has no colours. */
  color: z.string(),
  stock: z.number().int().nonnegative(),
  /** UZS integer som. Absent → the product's `price`. */
  price: z.number().int().positive().optional(),
  sku: z.string().optional(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

/** Id of the synthetic variant that stands in for a product without `variants`. */
export const DEFAULT_VARIANT_ID = 'default';

/**
 * Deterministic variant id. Encoded so a `|` inside a size or colour cannot
 * make two combinations collide.
 */
export function variantIdFor(size: string, color: string): string {
  return `${encodeURIComponent(size)}|${encodeURIComponent(color)}`;
}

/** The fields of a product the variant helpers read. */
export interface VariantSource {
  price: number;
  stock: number;
  sizes: readonly string[];
  colors: readonly string[];
  variants?: readonly ProductVariant[] | undefined;
}

/** True when the product was written before per-variant stock existed. */
export function isLegacyProduct(product: VariantSource): boolean {
  return product.variants === undefined || product.variants.length === 0;
}

/**
 * The product's sellable variants. A legacy product (no `variants`) gets one
 * synthetic variant carrying the product-level stock and price, so every
 * caller can treat both shapes the same way.
 */
export function productVariants(product: VariantSource): ProductVariant[] {
  if (product.variants && product.variants.length > 0) return [...product.variants];
  return [{ id: DEFAULT_VARIANT_ID, size: '', color: '', stock: product.stock }];
}

/**
 * Finds the variant a size/colour pick refers to. For a legacy product every
 * pick maps to the single default variant — its size/colour lists are only
 * descriptive and share one stock.
 */
export function findVariant(
  product: VariantSource,
  size: string,
  color: string,
): ProductVariant | undefined {
  if (isLegacyProduct(product)) return productVariants(product)[0];
  return product.variants?.find((v) => v.size === size && v.color === color);
}

/** Looks a variant up by id; legacy products answer the default id. */
export function findVariantById(
  product: VariantSource,
  variantId: string,
): ProductVariant | undefined {
  return productVariants(product).find((v) => v.id === variantId);
}

/** Unit price of a variant: its own price, else the product's. */
export function variantPrice(
  product: Pick<VariantSource, 'price'>,
  variant: ProductVariant,
): number {
  return variant.price ?? product.price;
}

/** Product-level stock: the sum over variants (what catalog badges show). */
export function totalVariantStock(variants: readonly Pick<ProductVariant, 'stock'>[]): number {
  return variants.reduce((sum, v) => sum + v.stock, 0);
}

/** Lowest and highest unit price across variants. */
export function variantPriceRange(product: VariantSource): { min: number; max: number } {
  const prices = productVariants(product).map((v) => variantPrice(product, v));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** An empty axis still yields one combination, with '' for that axis. */
function axis(values: readonly string[]): string[] {
  return values.length > 0 ? [...values] : [''];
}

/**
 * Builds the variant list for a product form: the cartesian product of sizes ×
 * colours minus `excluded` ids. Existing rows keep their stock/price/sku, so
 * adding a size never wipes the numbers already typed for the others; new
 * combinations start with zero stock.
 */
export function buildVariantMatrix(
  sizes: readonly string[],
  colors: readonly string[],
  existing: readonly ProductVariant[] = [],
  excluded: readonly string[] = [],
): ProductVariant[] {
  const byId = new Map(existing.map((v) => [v.id, v]));
  const skip = new Set(excluded);
  const out: ProductVariant[] = [];
  for (const size of axis(sizes)) {
    for (const color of axis(colors)) {
      const id = variantIdFor(size, color);
      if (skip.has(id)) continue;
      const prev = byId.get(id);
      out.push(prev ? { ...prev, size, color } : { id, size, color, stock: 0 });
    }
  }
  return out;
}

/** Excluded ids that still name a real combination (drops stale ones). */
export function pruneExcluded(
  sizes: readonly string[],
  colors: readonly string[],
  excluded: readonly string[],
): string[] {
  const live = new Set(axis(sizes).flatMap((s) => axis(colors).map((c) => variantIdFor(s, c))));
  return excluded.filter((id) => live.has(id));
}

/** Variant identity a cart line is reconciled by (legacy lines lack an id). */
export interface VariantRef {
  variantId?: string | undefined;
  size: string;
  color: string;
}

/**
 * Resolves a cart/order line to its variant: by `variantId` when the line has
 * one, else by size/colour (carts persisted before variants existed).
 */
export function resolveLineVariant(
  product: VariantSource,
  line: VariantRef,
): ProductVariant | undefined {
  if (line.variantId) return findVariantById(product, line.variantId);
  return findVariant(product, line.size, line.color);
}

/**
 * Variant rows the admin form opens with. A product that already has variants
 * is re-synced to its sizes × colours; a legacy one gets a fresh matrix with
 * zero stock — unless it collapses to a single combination, which simply
 * inherits the old product-level stock. Splitting shared stock across several
 * sizes is the admin's call, never guessed.
 */
export function initialFormVariants(
  product: VariantSource & { variantsExcluded?: readonly string[] | undefined },
): ProductVariant[] {
  const excluded = product.variantsExcluded ?? [];
  if (!isLegacyProduct(product)) {
    return buildVariantMatrix(product.sizes, product.colors, product.variants, excluded);
  }
  const matrix = buildVariantMatrix(product.sizes, product.colors, [], excluded);
  const [only] = matrix;
  return matrix.length === 1 && only ? [{ ...only, stock: product.stock }] : matrix;
}

export interface VariantOption {
  value: string;
  /** No in-stock variant has this value (given the other axis' pick). */
  disabled: boolean;
}

export interface VariantPicker {
  needsSize: boolean;
  needsColor: boolean;
  sizes: VariantOption[];
  colors: VariantOption[];
  /** Set once every required axis is picked and the combination exists. */
  variant: ProductVariant | undefined;
  /** Unit price to show: the picked variant's, else the cheapest. */
  price: number;
  /** True when variants differ in price and none is picked yet ("from …"). */
  priceIsFrom: boolean;
  /** Units purchasable for the current pick (0 until a variant is picked). */
  available: number;
  canAdd: boolean;
}

/**
 * Pure state of the product page's size/colour picker, shared by web and
 * mobile. A value is disabled when no variant carrying it — and the other
 * axis' current pick — has stock, so a sold-out combination cannot be chosen.
 * Legacy products keep their descriptive size/colour lists fully enabled and
 * sell from the shared stock.
 */
export function describeVariantPicker(
  product: VariantSource,
  size: string | null,
  color: string | null,
): VariantPicker {
  const legacy = isLegacyProduct(product);
  const variants = productVariants(product);
  const needsSize = product.sizes.length > 0;
  const needsColor = product.colors.length > 0;

  const inStock = (pred: (v: ProductVariant) => boolean): boolean =>
    legacy ? product.stock > 0 : variants.some((v) => v.stock > 0 && pred(v));

  const sizes = product.sizes.map((value) => ({
    value,
    disabled: !inStock((v) => v.size === value && (color === null || v.color === color)),
  }));
  const colors = product.colors.map((value) => ({
    value,
    disabled: !inStock((v) => v.color === value && (size === null || v.size === size)),
  }));

  const picked = (!needsSize || size !== null) && (!needsColor || color !== null);
  const variant = picked ? findVariant(product, size ?? '', color ?? '') : undefined;
  const range = variantPriceRange(product);
  const available = variant?.stock ?? 0;

  return {
    needsSize,
    needsColor,
    sizes,
    colors,
    variant,
    price: variant ? variantPrice(product, variant) : range.min,
    priceIsFrom: !variant && range.min !== range.max,
    available,
    canAdd: available > 0,
  };
}

/**
 * True when every line resolves to a live variant with enough stock. Lines are
 * summed per variant first: a legacy product's lines in different sizes all
 * draw on its one shared stock, so checking them one by one would oversell.
 * `products[i]` is the current document for `lines[i]` (null if deleted).
 */
export function stockCoversLines(
  lines: readonly (VariantRef & { productId: string; quantity: number })[],
  products: readonly (VariantSource | null | undefined)[],
): boolean {
  const wanted = new Map<string, { stock: number; qty: number }>();
  for (const [idx, line] of lines.entries()) {
    const product = products[idx];
    const variant = product ? resolveLineVariant(product, line) : undefined;
    if (!variant) return false;
    const key = JSON.stringify([line.productId, variant.id]);
    const entry = wanted.get(key) ?? { stock: variant.stock, qty: 0 };
    entry.qty += line.quantity;
    wanted.set(key, entry);
  }
  return [...wanted.values()].every((e) => e.qty <= e.stock);
}
