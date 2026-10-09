import { z } from 'zod';
import type { LocalizedText } from './localized';

/**
 * Uzbekistan's regions. Addresses store the `id`; delivery prices are keyed by
 * it. Older addresses may hold free text — they fall back to the default fee.
 */
export const UZ_REGIONS = [
  { id: 'tashkent-city', name: { uz: 'Toshkent shahri', en: 'Tashkent city', ru: 'г. Ташкент' } },
  {
    id: 'tashkent',
    name: { uz: 'Toshkent viloyati', en: 'Tashkent region', ru: 'Ташкентская обл.' },
  },
  { id: 'andijan', name: { uz: 'Andijon', en: 'Andijan', ru: 'Андижан' } },
  { id: 'bukhara', name: { uz: 'Buxoro', en: 'Bukhara', ru: 'Бухара' } },
  { id: 'fergana', name: { uz: 'Fargʻona', en: 'Fergana', ru: 'Фергана' } },
  { id: 'jizzakh', name: { uz: 'Jizzax', en: 'Jizzakh', ru: 'Джизак' } },
  { id: 'khorezm', name: { uz: 'Xorazm', en: 'Khorezm', ru: 'Хорезм' } },
  { id: 'namangan', name: { uz: 'Namangan', en: 'Namangan', ru: 'Наманган' } },
  { id: 'navoi', name: { uz: 'Navoiy', en: 'Navoi', ru: 'Навои' } },
  { id: 'kashkadarya', name: { uz: 'Qashqadaryo', en: 'Kashkadarya', ru: 'Кашкадарья' } },
  {
    id: 'karakalpakstan',
    name: { uz: 'Qoraqalpogʻiston', en: 'Karakalpakstan', ru: 'Каракалпакстан' },
  },
  { id: 'samarkand', name: { uz: 'Samarqand', en: 'Samarkand', ru: 'Самарканд' } },
  { id: 'syrdarya', name: { uz: 'Sirdaryo', en: 'Syrdarya', ru: 'Сырдарья' } },
  { id: 'surkhandarya', name: { uz: 'Surxondaryo', en: 'Surkhandarya', ru: 'Сурхандарья' } },
] as const satisfies readonly { id: string; name: LocalizedText }[];

export type RegionId = (typeof UZ_REGIONS)[number]['id'];

export function regionName(id: string): LocalizedText | undefined {
  return UZ_REGIONS.find((r) => r.id === id)?.name;
}

/** settings/delivery — one document, public read, admin write. */
export const DeliverySettingsSchema = z.object({
  /** Fee for any region not listed in `regions` (and for legacy free-text addresses). */
  defaultFee: z.number().int().nonnegative(),
  /** regionId → fee, UZS integer som. */
  regions: z.record(z.string(), z.number().int().nonnegative()),
  /** Subtotal (after discount) from which delivery is free; 0 = never free. */
  freeFrom: z.number().int().nonnegative(),
});
export type DeliverySettings = z.infer<typeof DeliverySettingsSchema>;

/**
 * Delivery fee for a region. Mirrors the check in firestore.rules (orders
 * create): no settings → 0; reached freeFrom → 0; else region fee or default.
 */
export function deliveryFeeFor(
  settings: DeliverySettings | null | undefined,
  regionId: string,
  amountAfterDiscount: number,
): number {
  if (!settings) return 0;
  if (settings.freeFrom > 0 && amountAfterDiscount >= settings.freeFrom) return 0;
  return settings.regions[regionId] ?? settings.defaultFee;
}
