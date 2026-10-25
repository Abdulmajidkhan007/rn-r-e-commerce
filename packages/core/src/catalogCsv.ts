import type { Product } from './product';
import { productVariants, totalVariantStock, variantIdFor, type ProductVariant } from './variant';

/**
 * Catalog CSV: one row per product variant (size × colour). A product without
 * variants is a single row with empty size and colour. Photos, ratings and
 * visibility are not part of the file — an import creates inactive products
 * without photos, the admin attaches them and switches the product on.
 */
export const CATALOG_CSV_COLUMNS = [
  'productId',
  'name_uz',
  'name_en',
  'name_ru',
  'description_uz',
  'description_en',
  'description_ru',
  'categoryId',
  'price',
  'compareAtPrice',
  'size',
  'color',
  'stock',
  'variantPrice',
  'sku',
] as const;

export type CatalogCsvColumn = (typeof CATALOG_CSV_COLUMNS)[number];

// --- Generic CSV (RFC 4180) ---

function needsQuotes(value: string): boolean {
  return /[",\r\n]/.test(value) || value !== value.trim();
}

/** Rows → CSV text (CRLF line endings, so spreadsheets open it cleanly). */
export function serializeCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map((row) =>
      row.map((cell) => (needsQuotes(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','),
    )
    .join('\r\n')
    .concat(rows.length > 0 ? '\r\n' : '');
}

/** CSV text → rows. Handles quotes, escaped quotes, newlines in cells, a BOM; skips blank lines. */
export function parseCsv(text: string): string[][] {
  const src = text.startsWith('﻿') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let touched = false;

  const endCell = (): void => {
    row.push(cell);
    cell = '';
  };
  const endRow = (): void => {
    endCell();
    if (!(row.length === 1 && row[0] === '' && !touched)) rows.push(row);
    row = [];
    touched = false;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      touched = true;
    } else if (ch === ',') {
      touched = true;
      endCell();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      endRow();
    } else {
      touched = true;
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0 || touched) endRow();
  return rows;
}

// --- Products ⇄ CSV ---

type ExportedProduct = Pick<
  Product,
  | 'id'
  | 'name'
  | 'description'
  | 'categoryId'
  | 'price'
  | 'compareAtPrice'
  | 'stock'
  | 'sizes'
  | 'colors'
  | 'variants'
>;

export function productsToCsvRows(products: readonly ExportedProduct[]): string[][] {
  const rows: string[][] = [[...CATALOG_CSV_COLUMNS]];
  for (const p of products) {
    for (const v of productVariants(p)) {
      rows.push([
        p.id,
        p.name.uz,
        p.name.en ?? '',
        p.name.ru ?? '',
        p.description.uz,
        p.description.en ?? '',
        p.description.ru ?? '',
        p.categoryId,
        String(p.price),
        p.compareAtPrice === undefined ? '' : String(p.compareAtPrice),
        v.size,
        v.color,
        String(v.stock),
        v.price === undefined ? '' : String(v.price),
        v.sku ?? '',
      ]);
    }
  }
  return rows;
}

export function productsToCsv(products: readonly ExportedProduct[]): string {
  return serializeCsv(productsToCsvRows(products));
}

export type CatalogCsvErrorCode =
  | 'missingColumn'
  | 'nameRequired'
  | 'badNumber'
  | 'unknownCategory'
  | 'inconsistent'
  | 'duplicateVariant';

export interface CatalogCsvError {
  /** 1-based line of the file (the header is line 1). */
  line: number;
  code: CatalogCsvErrorCode;
  /** Column or conflicting field, when it helps. */
  detail?: string;
}

/** A product ready to be created: always inactive, without photos or ratings. */
export interface CatalogImportProduct {
  id: string;
  input: Pick<
    Product,
    | 'name'
    | 'description'
    | 'price'
    | 'compareAtPrice'
    | 'categoryId'
    | 'images'
    | 'sizes'
    | 'colors'
    | 'stock'
    | 'variants'
    | 'rating'
    | 'reviewCount'
    | 'isActive'
  >;
}

export interface CatalogCsvParseOptions {
  /** Ids of existing categories; a row naming another one is an error. */
  categoryIds: ReadonlySet<string>;
  /** Id for a product whose rows carry no `productId`. */
  newId: () => string;
}

export interface CatalogCsvParseResult {
  products: CatalogImportProduct[];
  errors: CatalogCsvError[];
}

const UINT = /^\d+$/;

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v !== ''))];
}

/**
 * CSV text → products. Rows of one product are grouped by `productId` (or, when
 * it is blank, by `name_uz`). Any error leaves `products` empty — a half-valid
 * file is never partially imported.
 */
export function parseCatalogCsv(
  text: string,
  options: CatalogCsvParseOptions,
): CatalogCsvParseResult {
  const rows = parseCsv(text);
  const errors: CatalogCsvError[] = [];
  const header = rows[0] ?? [];
  const index = new Map<string, number>();
  header.forEach((name, i) => index.set(name.trim(), i));
  for (const column of CATALOG_CSV_COLUMNS) {
    if (!index.has(column)) errors.push({ line: 1, code: 'missingColumn', detail: column });
  }
  if (errors.length > 0) return { products: [], errors };

  const get = (row: readonly string[], column: CatalogCsvColumn): string =>
    (row[index.get(column) as number] ?? '').trim();
  // Names and text keep inner spacing but are compared trimmed.
  const raw = (row: readonly string[], column: CatalogCsvColumn): string =>
    row[index.get(column) as number] ?? '';

  interface Group {
    line: number;
    id: string;
    head: string[];
    variants: ProductVariant[];
    seen: Set<string>;
  }
  const groups = new Map<string, Group>();

  rows.slice(1).forEach((row, i) => {
    const line = i + 2;
    const nameUz = raw(row, 'name_uz').trim();
    if (nameUz === '') {
      errors.push({ line, code: 'nameRequired', detail: 'name_uz' });
      return;
    }
    let ok = true;
    const uint = (column: CatalogCsvColumn, min: number, optional = false): number | undefined => {
      const v = get(row, column);
      if (optional && v === '') return undefined;
      if (!UINT.test(v) || Number(v) < min || !Number.isSafeInteger(Number(v))) {
        errors.push({ line, code: 'badNumber', detail: column });
        ok = false;
        return undefined;
      }
      return Number(v);
    };
    const price = uint('price', 1);
    uint('compareAtPrice', 1, true);
    const stock = uint('stock', 0);
    const variantPrice = uint('variantPrice', 1, true);
    const categoryId = get(row, 'categoryId');
    if (!options.categoryIds.has(categoryId)) {
      errors.push({ line, code: 'unknownCategory', detail: categoryId });
      ok = false;
    }
    if (!ok || price === undefined || stock === undefined) return;

    const id = get(row, 'productId');
    const key = id !== '' ? `id:${id}` : `name:${nameUz}`;
    // Everything that must be identical on every row of a product.
    const head = [
      nameUz,
      raw(row, 'name_en').trim(),
      raw(row, 'name_ru').trim(),
      raw(row, 'description_uz'),
      raw(row, 'description_en'),
      raw(row, 'description_ru'),
      categoryId,
      String(price),
      get(row, 'compareAtPrice'),
    ];
    let group = groups.get(key);
    if (!group) {
      group = {
        line,
        id: id !== '' ? id : options.newId(),
        head,
        variants: [],
        seen: new Set(),
      };
      groups.set(key, group);
    } else if (group.head.some((v, n) => v !== head[n])) {
      errors.push({ line, code: 'inconsistent', detail: id !== '' ? id : nameUz });
      return;
    }

    const size = get(row, 'size');
    const color = get(row, 'color');
    const variantId = variantIdFor(size, color);
    if (group.seen.has(variantId)) {
      errors.push({ line, code: 'duplicateVariant', detail: `${size}/${color}` });
      return;
    }
    group.seen.add(variantId);
    const sku = get(row, 'sku');
    group.variants.push({
      id: variantId,
      size,
      color,
      stock,
      ...(variantPrice !== undefined ? { price: variantPrice } : {}),
      ...(sku !== '' ? { sku } : {}),
    });
  });

  if (errors.length > 0) return { products: [], errors };

  const products: CatalogImportProduct[] = [];
  for (const g of groups.values()) {
    const [nameUz, nameEn, nameRu, descUz, descEn, descRu, categoryId, price, compareAt] =
      g.head as [string, string, string, string, string, string, string, string, string];
    const only = g.variants.length === 1 ? (g.variants[0] as ProductVariant) : undefined;
    // A lone row without size/colour is the legacy shape: product-level stock.
    const legacy =
      only !== undefined && only.size === '' && only.color === '' && !only.price && !only.sku;
    products.push({
      id: g.id,
      input: {
        name: { uz: nameUz, ...(nameEn ? { en: nameEn } : {}), ...(nameRu ? { ru: nameRu } : {}) },
        description: {
          uz: descUz,
          ...(descEn ? { en: descEn } : {}),
          ...(descRu ? { ru: descRu } : {}),
        },
        price: Number(price),
        ...(compareAt !== '' ? { compareAtPrice: Number(compareAt) } : {}),
        categoryId,
        images: [],
        sizes: uniqueNonEmpty(g.variants.map((v) => v.size)),
        colors: uniqueNonEmpty(g.variants.map((v) => v.color)),
        stock: legacy ? (only as ProductVariant).stock : totalVariantStock(g.variants),
        ...(legacy ? {} : { variants: g.variants }),
        rating: 0,
        reviewCount: 0,
        isActive: false,
      },
    });
  }
  return { products, errors };
}
