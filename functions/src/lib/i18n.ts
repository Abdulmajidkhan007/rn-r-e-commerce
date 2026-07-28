import type { OrderStatus } from '../types.js';

// Deliberate duplication of packages/i18n copy: functions are self-contained
// outside the monorepo build (see types.ts). Keep the strings in sync by hand
// with packages/i18n/src/locales/*/common.json (pushTitles.*, pushBodies.*,
// orderStatus.*).

export type Locale = 'uz' | 'en' | 'ru';

const FALLBACK: Locale = 'uz';
const LOCALES: readonly Locale[] = ['uz', 'en', 'ru'];

export interface Copy {
  /** pushTitles.newOrder */
  newOrder: string;
  /** pushTitles.orderCancelled */
  orderCancelled: string;
  /** pushBodies.orderOutOfStockReason */
  outOfStockReason: string;
  /** orderStatus.* — human label per status */
  status: Record<OrderStatus, string>;
  /** pushBodies.orderStatusChangedTo */
  statusBody: (statusLabel: string) => string;
}

const COPY: Record<Locale, Copy> = {
  uz: {
    newOrder: 'Yangi buyurtma',
    orderCancelled: 'Buyurtma bekor qilindi',
    outOfStockReason: 'Mahsulot omborda qolmagan',
    status: {
      pending: 'Kutilmoqda',
      deposit_paid: "Oldindan to'lov qilindi",
      processing: 'Tayyorlanmoqda',
      shipped: "Jo'natildi",
      delivered: 'Yetkazildi',
      cancelled: 'Bekor qilindi',
    },
    statusBody: (s) => `Buyurtmangiz holati: ${s}`,
  },
  en: {
    newOrder: 'New order',
    orderCancelled: 'Order cancelled',
    outOfStockReason: 'Item is out of stock',
    status: {
      pending: 'Pending',
      deposit_paid: 'Deposit paid',
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
    statusBody: (s) => `Your order status: ${s}`,
  },
  ru: {
    newOrder: 'Новый заказ',
    orderCancelled: 'Заказ отменён',
    outOfStockReason: 'Товар отсутствует на складе',
    status: {
      pending: 'В ожидании',
      deposit_paid: 'Внесена предоплата',
      processing: 'В обработке',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      cancelled: 'Отменён',
    },
    statusBody: (s) => `Статус вашего заказа: ${s}`,
  },
};

/** Reads the `language` mirror off a user doc, falling back to Uzbek. */
export function localeFor(userData: Record<string, unknown>): Locale {
  const language = userData['language'];
  return LOCALES.find((l) => l === language) ?? FALLBACK;
}

export function getCopy(locale: Locale): Copy {
  return COPY[locale];
}
