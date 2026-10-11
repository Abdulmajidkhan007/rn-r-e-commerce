/**
 * Writes starter delivery prices to `settings/delivery` — only when the admin
 * has not configured delivery yet. Never overwrites: once the admin saves
 * prices in Admin → Yetkazish, this script leaves them alone.
 *
 * The amounts are a starting point (so-m), not a tariff: edit them in the
 * admin panel. Without any settings delivery is free, which undercharges.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json node scripts/seed-delivery.ts
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const STARTER = {
  defaultFee: 30_000,
  freeFrom: 500_000,
  regions: {
    fergana: 15_000,
    andijan: 20_000,
    namangan: 20_000,
    'tashkent-city': 25_000,
    tashkent: 25_000,
    syrdarya: 30_000,
    jizzakh: 30_000,
    samarkand: 30_000,
    bukhara: 35_000,
    navoi: 35_000,
    kashkadarya: 35_000,
    surkhandarya: 35_000,
    khorezm: 40_000,
    karakalpakstan: 40_000,
  },
};

async function main(): Promise<void> {
  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? './service-account-key.json';
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount) });
  const ref = getFirestore().collection('settings').doc('delivery');
  const created = await getFirestore().runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return false;
    tx.set(ref, STARTER);
    return true;
  });
  console.log(
    created
      ? "::notice title=Yetkazish narxlari::Boshlang'ich narxlar yozildi — Admin → Yetkazish bo'limida o'zgartiring."
      : '✓ Yetkazish narxlari allaqachon sozlangan — tegilmadi.',
  );
}

void main().catch((error: unknown) => {
  console.error('Failed to seed delivery settings:', error);
  process.exit(1);
});
