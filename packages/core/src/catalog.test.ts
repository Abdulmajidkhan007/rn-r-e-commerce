import { describe, expect, it } from 'vitest';
import {
  TRASH_RETENTION_DAYS,
  enforceHiddenInvariant,
  hasNoImages,
  isPurgeable,
  isStorefrontVisible,
  isTrashed,
  trashDaysLeft,
} from './catalog';
import {
  CATALOG_CSV_COLUMNS,
  parseCatalogCsv,
  parseCsv,
  productsToCsv,
  serializeCsv,
  type CatalogImportProduct,
} from './catalogCsv';

const DAY = 24 * 60 * 60 * 1000;

describe('catalog visibility', () => {
  it('shows only active, non-draft, non-deleted products', () => {
    expect(isStorefrontVisible({ isActive: true })).toBe(true);
    expect(isStorefrontVisible({ isActive: false })).toBe(false);
    expect(isStorefrontVisible({ isActive: true, isDraft: true })).toBe(false);
    expect(isStorefrontVisible({ isActive: true, deletedAt: 1 })).toBe(false);
  });

  it('purges only after the retention period', () => {
    const now = 100 * DAY;
    expect(isTrashed({})).toBe(false);
    expect(isPurgeable({}, now)).toBe(false);
    expect(isPurgeable({ deletedAt: now - 29 * DAY }, now)).toBe(false);
    expect(isPurgeable({ deletedAt: now - 30 * DAY }, now)).toBe(true);
    expect(trashDaysLeft({ deletedAt: now - 5 * DAY }, now)).toBe(TRASH_RETENTION_DAYS - 5);
    expect(trashDaysLeft({ deletedAt: now - 60 * DAY }, now)).toBe(0);
  });

  it('detects products without photos', () => {
    expect(hasNoImages({ images: [] })).toBe(true);
    expect(hasNoImages({ images: ['kwimg:a'] })).toBe(false);
  });

  it('keeps drafts and trashed products inactive', () => {
    expect(enforceHiddenInvariant({ isActive: true, isDraft: true }, null)).toEqual({
      isActive: false,
      isDraft: true,
    });
    expect(enforceHiddenInvariant({ isActive: true }, { isDraft: true })).toEqual({
      isActive: false,
    });
    expect(enforceHiddenInvariant({ isActive: true }, { deletedAt: 5 })).toEqual({
      isActive: false,
    });
    expect(enforceHiddenInvariant({ isActive: true }, { isDraft: false })).toEqual({
      isActive: true,
    });
    // Publishing the draft in the same patch lets it become active.
    expect(enforceHiddenInvariant({ isActive: true, isDraft: false }, { isDraft: true })).toEqual({
      isActive: true,
      isDraft: false,
    });
    // A patch that does not touch isActive is left alone.
    expect(enforceHiddenInvariant({}, { isDraft: true })).toEqual({});
  });
});

describe('csv', () => {
  it('serializes and parses quotes, commas and newlines', () => {
    const rows = [
      ['a', 'b,c', 'say "hi"'],
      ['line1\nline2', ' padded ', ''],
    ];
    const text = serializeCsv(rows);
    expect(text).toBe('a,"b,c","say ""hi"""\r\n"line1\nline2"," padded ",\r\n');
    expect(parseCsv(text)).toEqual(rows);
  });

  it('accepts LF, a BOM and blank lines', () => {
    expect(parseCsv('﻿a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsv('a,,\r\n"",x,')).toEqual([
      ['a', '', ''],
      ['', 'x', ''],
    ]);
  });
});

const HEADER = CATALOG_CSV_COLUMNS.join(',');
const CATEGORIES = new Set(['c1', 'c2']);

function parse(text: string): ReturnType<typeof parseCatalogCsv> {
  let n = 0;
  return parseCatalogCsv(text, { categoryIds: CATEGORIES, newId: () => `new${++n}` });
}

/** Back to the shape the exporter reads (id + the product input). */
function asExported(items: CatalogImportProduct[]): Parameters<typeof productsToCsv>[0] {
  return items.map((p) => ({ id: p.id, ...p.input }));
}

describe('catalog CSV import', () => {
  it('groups variant rows into one product and derives sizes, colours and stock', () => {
    const csv = [
      HEADER,
      "p1,Ko'ylak,Dress,Платье,Yengil,,,c1,100000,150000,S,Red,3,,SKU1",
      "p1,Ko'ylak,Dress,Платье,Yengil,,,c1,100000,150000,M,Red,4,120000,",
      'p2,Shim,,,,,,c2,50000,,,,7,,',
    ].join('\n');
    const { products, errors } = parse(csv);
    expect(errors).toEqual([]);
    expect(products).toHaveLength(2);
    const [p1, p2] = products as [CatalogImportProduct, CatalogImportProduct];
    expect(p1.id).toBe('p1');
    expect(p1.input.sizes).toEqual(['S', 'M']);
    expect(p1.input.colors).toEqual(['Red']);
    expect(p1.input.stock).toBe(7);
    expect(p1.input.variants?.[1]).toMatchObject({ size: 'M', price: 120000 });
    expect(p1.input.variants?.[0]).toMatchObject({ sku: 'SKU1' });
    expect(p1.input.compareAtPrice).toBe(150000);
    // Imported products are never live and carry no photos.
    for (const p of products) {
      expect(p.input.isActive).toBe(false);
      expect(p.input.images).toEqual([]);
    }
    // A lone row without size/colour keeps the legacy shape.
    expect(p2.input.variants).toBeUndefined();
    expect(p2.input.stock).toBe(7);
  });

  it('gives rows without productId an id, grouped by name', () => {
    const csv = [
      HEADER,
      ',A,,,,,,c1,1000,,S,,1,,',
      ',A,,,,,,c1,1000,,M,,2,,',
      ',B,,,,,,c1,2000,,,,1,,',
    ].join('\n');
    const { products, errors } = parse(csv);
    expect(errors).toEqual([]);
    expect(products.map((p) => p.id)).toEqual(['new1', 'new2']);
    expect(products[0]?.input.stock).toBe(3);
  });

  it('reports row errors with line numbers and imports nothing', () => {
    const csv = [
      HEADER,
      'p1,A,,,,,,c1,1000,,S,,1,,',
      'p2,,,,,,,c1,1000,,,,1,,',
      'p3,C,,,,,,nope,1000,,,,1,,',
      'p4,D,,,,,,c1,abc,,,,1,,',
      'p1,A,,,,,,c1,1000,,S,,1,,',
      'p1,A changed,,,,,,c1,1000,,M,,1,,',
    ].join('\n');
    const { products, errors } = parse(csv);
    expect(products).toEqual([]);
    expect(errors).toEqual([
      { line: 3, code: 'nameRequired', detail: 'name_uz' },
      { line: 4, code: 'unknownCategory', detail: 'nope' },
      { line: 5, code: 'badNumber', detail: 'price' },
      { line: 6, code: 'duplicateVariant', detail: 'S/' },
      { line: 7, code: 'inconsistent', detail: 'p1' },
    ]);
  });

  it('rejects a file missing columns', () => {
    const { products, errors } = parse('productId,name_uz\np1,A');
    expect(products).toEqual([]);
    expect(errors[0]).toEqual({ line: 1, code: 'missingColumn', detail: 'name_en' });
  });

  it('round-trips a 50-row CSV: import then export is identical', () => {
    const lines: string[] = [HEADER];
    // 12 products × 4 variants (48 rows) + 2 plain products = 50 data rows.
    for (let i = 1; i <= 12; i++) {
      const sizes = ['2-3', '4-5'];
      const colors = ['Qizil', "Ko'k, och"];
      for (const size of sizes) {
        for (const color of colors) {
          const colorCell = color.includes(',') ? `"${color}"` : color;
          const price = size === '4-5' ? '99000' : '';
          lines.push(
            `prod${i},Mahsulot ${i},Product ${i},Товар ${i},"Tavsif, ${i}",,"Say ""hi""",c${(i % 2) + 1},${90000 + i},${i % 3 === 0 ? '120000' : ''},${size},${colorCell},${i},${price},${price ? `SKU-${i}` : ''}`,
          );
        }
      }
    }
    lines.push('plain1,Oddiy,,,,,,c1,15000,,,,9,,');
    lines.push('plain2,Ikkinchi,,,"Ko\'p\nqatorli",,,c2,25000,30000,,,0,,');
    const csv = lines.join('\r\n') + '\r\n';
    expect(lines.length - 1).toBe(50);

    const { products, errors } = parse(csv);
    expect(errors).toEqual([]);
    expect(products).toHaveLength(14);
    expect(productsToCsv(asExported(products))).toBe(csv);

    // And once more through the parser: stable.
    const again = parse(productsToCsv(asExported(products)));
    expect(again.products).toEqual(products);
  });
});
