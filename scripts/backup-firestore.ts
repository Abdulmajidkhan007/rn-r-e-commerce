/**
 * Encrypted Firestore backup: exports every collection (with sub-collections),
 * encrypts it (scrypt + AES-256-GCM, see scripts/lib/backup-format.ts) and
 * writes ONE file. Then reads the file back and decrypts it to prove it is
 * restorable before anyone relies on it.
 *
 *   BACKUP_PASSPHRASE=… GOOGLE_APPLICATION_CREDENTIALS=./key.json \
 *     node scripts/backup-firestore.ts <out.kwbk> [--collections a,b]
 *
 *   # emulator
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 BACKUP_PASSPHRASE=… \
 *     node scripts/backup-firestore.ts out.kwbk --project kidswear-local
 *
 * Logs only collection names, counts, size and the file's SHA-256 — never data.
 * Guide: docs/ZAXIRA.md.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { assertPassphrase, decryptBackup, encryptBackup } from './lib/backup-format.ts';
import { connectAdmin, exportFirestore, summarize } from './lib/backup-firestore-io.ts';
import { listFlag, parseArgs, stringFlag } from './lib/cli-args.ts';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), []);
  const out = args.positional[0];
  if (!out) {
    console.error(
      'Usage: node scripts/backup-firestore.ts <out.kwbk> [--project id] [--collections a,b]',
    );
    process.exit(2);
  }
  const passphrase = process.env['BACKUP_PASSPHRASE'];
  assertPassphrase(passphrase);

  const { db, projectId } = connectAdmin(stringFlag(args, 'project'));
  const collections = listFlag(args, 'collections');
  const snapshot = await exportFirestore(db, projectId, collections ? { collections } : {});
  const file = encryptBackup(snapshot, passphrase);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, file, { mode: 0o600 });

  // Verify what is on disk, not what is in memory.
  const check = decryptBackup(readFileSync(out), passphrase);
  if (JSON.stringify(check) !== JSON.stringify(snapshot)) {
    throw new Error('Verification failed: decrypted backup differs from the export');
  }

  const counts = summarize(snapshot);
  console.log(`Project:     ${projectId}`);
  console.log(`Documents:   ${snapshot.documents.length}`);
  for (const [col, n] of Object.entries(counts)) console.log(`  ${col}: ${n}`);
  console.log(`File:        ${out} (${file.length} bytes, encrypted)`);
  console.log(`SHA-256:     ${createHash('sha256').update(file).digest('hex')}`);
  console.log('Verified:    decrypts with the passphrase and matches the export');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
