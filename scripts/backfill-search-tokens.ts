/**
 * Backfills `searchTokens` on existing products.
 *
 * Server-side catalog search matches a denormalized token array. Products
 * written before that existed have no tokens, so they are invisible to search
 * until this runs. New and edited products get tokens from the admin mutations.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json \
 *     node scripts/backfill-search-tokens.ts [--dry-run]
 *
 * Safe to re-run: it recomputes tokens for every product and writes only when
 * they differ, so it is also the way to repair the index after changing
 * `buildSearchTokens`.
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildSearchTokens } from '../packages/utils/src/search.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_LIMIT = 400; // Firestore caps a batch at 500 writes.

const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key path.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount;
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function sameTokens(a: unknown, b: string[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  const existing = new Set(a as string[]);
  return b.every((token) => existing.has(token));
}

async function main(): Promise<void> {
  const snap = await db.collection('products').get();
  console.log(`Scanning ${snap.size} products${DRY_RUN ? ' (dry run)' : ''}…`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const tokens = buildSearchTokens(data['name'], data['description']);

    if (sameTokens(data['searchTokens'], tokens)) {
      skipped++;
      continue;
    }

    updated++;
    if (DRY_RUN) {
      console.log(`  would update ${doc.id} (${tokens.length} tokens)`);
      continue;
    }

    batch.update(doc.ref, { searchTokens: tokens });
    pending++;

    if (pending >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (!DRY_RUN && pending > 0) await batch.commit();

  console.log(`Done. ${updated} updated, ${skipped} already current.`);
}

main().catch((err: unknown) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
