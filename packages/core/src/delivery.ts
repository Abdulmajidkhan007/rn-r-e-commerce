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
  /** Smallest order (subtotal after discount) accepted; absent/0 = no minimum. */
  minOrder: z.number().int().nonnegative().optional(),
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

/**
 * Som still needed for free delivery, or `null` when there is no free-delivery
 * threshold. 0 once it is reached.
 */
export function freeDeliveryRemaining(
  settings: DeliverySettings | null | undefined,
  amountAfterDiscount: number,
): number | null {
  if (!settings || settings.freeFrom <= 0) return null;
  return Math.max(0, settings.freeFrom - amountAfterDiscount);
}

/**
 * Som missing to reach the minimum order; 0 when it is met or not set.
 * Mirrors `minOrderOk` in firestore.rules (orders create).
 */
export function minOrderShortfall(
  settings: DeliverySettings | null | undefined,
  amountAfterDiscount: number,
): number {
  const min = settings?.minOrder ?? 0;
  return Math.max(0, min - amountAfterDiscount);
}

type DeliveryLanguage = 'uz' | 'en' | 'ru';

const DELIVERY_TEXT = {
  free: { uz: 'Yetkazib berish bepul', en: 'Delivery is free', ru: 'Доставка бесплатная' },
  flat: { uz: 'Yetkazib berish: {a}', en: 'Delivery: {a}', ru: 'Доставка: {a}' },
  range: {
    uz: 'Yetkazib berish: {a} dan {b} gacha',
    en: 'Delivery: {a} to {b}',
    ru: 'Доставка: от {a} до {b}',
  },
  freeFrom: {
    uz: '{a} dan boshlab yetkazib berish bepul',
    en: 'Free delivery on orders from {a}',
    ru: 'Бесплатная доставка при заказе от {a}',
  },
  freeLeft: {
    uz: 'Bepul yetkazishga {a} qoldi',
    en: '{a} more for free delivery',
    ru: 'До бесплатной доставки {a}',
  },
  minOrder: {
    uz: 'Eng kam buyurtma — {a}',
    en: 'Minimum order is {a}',
    ru: 'Минимальный заказ — {a}',
  },
  minLeft: {
    uz: 'Eng kam buyurtma — {a}. Yana {b} qoʻshing',
    en: 'Minimum order is {a}. Add {b} more',
    ru: 'Минимальный заказ — {a}. Добавьте ещё {b}',
  },
} as const satisfies Record<string, LocalizedText & { en: string; ru: string }>;

/** Localized delivery sentences; `null` for a line that does not apply. */
export interface DeliveryText {
  /** Fee line: free, a flat fee, or the cheapest–dearest range over all regions. */
  summary: string;
  /**
   * Free-delivery line. Without an amount: the threshold. With an amount: how
   * much is left, or "free" once reached. `null` when there is no threshold.
   */
  free: string | null;
  /**
   * Minimum-order line. Without an amount: the minimum. With an amount: only
   * while it is not yet met (what is missing). `null` when not set / met.
   */
  min: string | null;
}

/**
 * The single source of delivery wording — web, mobile, cart, checkout, the
 * delivery page and the footer all render this instead of building their own
 * strings. Pure: money formatting is injected (`@kidswear/utils` formatPrice).
 * Without `amountAfterDiscount` it describes the shop's policy; with it, the
 * state of the current basket against that policy.
 */
export function deliveryText(
  settings: DeliverySettings | null | undefined,
  language: DeliveryLanguage,
  money: (som: number) => string,
  amountAfterDiscount?: number,
): DeliveryText {
  const fill = (tpl: Record<DeliveryLanguage, string>, a: number, b = 0): string =>
    tpl[language].replace('{a}', money(a)).replace('{b}', money(b));

  if (!settings) return { summary: DELIVERY_TEXT.free[language], free: null, min: null };

  const fees = [settings.defaultFee, ...Object.values(settings.regions)];
  const lo = Math.min(...fees);
  const hi = Math.max(...fees);
  const summary =
    hi === 0
      ? DELIVERY_TEXT.free[language]
      : lo === hi
        ? fill(DELIVERY_TEXT.flat, lo)
        : fill(DELIVERY_TEXT.range, lo, hi);

  const hasAmount = amountAfterDiscount !== undefined;
  const left = freeDeliveryRemaining(settings, amountAfterDiscount ?? 0);
  const free =
    left === null
      ? null
      : !hasAmount
        ? fill(DELIVERY_TEXT.freeFrom, settings.freeFrom)
        : left === 0
          ? DELIVERY_TEXT.free[language]
          : fill(DELIVERY_TEXT.freeLeft, left);

  const minOrder = settings.minOrder ?? 0;
  const short = minOrderShortfall(settings, amountAfterDiscount ?? Infinity);
  const min =
    minOrder <= 0
      ? null
      : !hasAmount
        ? fill(DELIVERY_TEXT.minOrder, minOrder)
        : short > 0
          ? fill(DELIVERY_TEXT.minLeft, minOrder, short)
          : null;

  return { summary, free, min };
}
