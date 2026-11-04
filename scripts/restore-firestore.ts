/**
 * Restores an encrypted backup made by scripts/backup-firestore.ts.
 *
 * Safe by default: without `--confirm <projectId>` it only decrypts and prints
 * what WOULD be written (dry run). Restore overwrites each backed-up document
 * with `set()`; documents that are not in the backup are left untouched.
 *
 *   # 1. dry run (target = the project of the service-account key)
 *   BACKUP_PASSPHRASE=… GOOGLE_APPLICATION_CREDENTIALS=./key.json \
 *     node scripts/restore-firestore.ts backup.kwbk --project my-proj
 *   # 2. really write
 *     … --project my-proj --confirm my-proj [--collections products,orders]
 *
 *   # emulator
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 BACKUP_PASSPHRASE=… \
 *     node scripts/restore-firestore.ts backup.kwbk --project kidswear-local --confirm kidswear-local
 *
 *   # only decrypt to plain JSON (contains personal data — delete after use)
 *   BACKUP_PASSPHRASE=… node scripts/restore-firestore.ts backup.kwbk --decrypt-to plain.json
 *
 * Guide: docs/ZAXIRA.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { assertPassphrase, decryptBackup } from './lib/backup-format.ts';
import { connectAdmin, importFirestore, summarize } from './lib/backup-firestore-io.ts';
import { listFlag, parseArgs, stringFlag } from './lib/cli-args.ts';

const USAGE =
  'Usage: node scripts/restore-firestore.ts <backup.kwbk> --project <id> [--confirm <id>] ' +
  '[--collections a,b] [--allow-other-project] | --decrypt-to <plain.json>';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), ['allow-other-project']);
  const input = args.positional[0];
  if (!input) {
    console.error(USAGE);
    process.exit(2);
  }
  const passphrase = process.env['BACKUP_PASSPHRASE'];
  assertPassphrase(passphrase);
  const snapshot = decryptBackup(readFileSync(input), passphrase);

  console.log(`Backup of:   ${snapshot.projectId}, made ${snapshot.createdAt}`);
  console.log(`Documents:   ${snapshot.documents.length}`);
  for (const [col, n] of Object.entries(summarize(snapshot))) console.log(`  ${col}: ${n}`);

  const decryptTo = stringFlag(args, 'decrypt-to');
  if (decryptTo) {
    writeFileSync(decryptTo, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
    console.log(`Decrypted to ${decryptTo} — it holds personal data; delete it when done.`);
    return;
  }

  const target = stringFlag(args, 'project');
  if (!target) {
    console.error(USAGE);
    process.exit(2);
  }
  const { db, projectId } = connectAdmin(target);
  if (projectId !== target) {
    throw new Error(`--project ${target} does not match the credentials' project ${projectId}`);
  }
  if (snapshot.projectId !== projectId && !args.flags.has('allow-other-project')) {
    throw new Error(
      `Backup is from "${snapshot.projectId}", target is "${projectId}". ` +
        'Pass --allow-other-project if that is intended.',
    );
  }

  const collections = listFlag(args, 'collections');
  const confirmed = stringFlag(args, 'confirm') === projectId;
  const result = await importFirestore(db, snapshot, {
    ...(collections ? { collections } : {}),
    dryRun: !confirmed,
  });

  const where = process.env['FIRESTORE_EMULATOR_HOST'] ? 'emulator' : 'LIVE project';
  if (!confirmed) {
    console.log(
      `\nDRY RUN — nothing written. ${result.written} documents would be written to ${where} ` +
        `"${projectId}" (${result.skipped} skipped by --collections).`,
    );
    console.log(`Re-run with --confirm ${projectId} to write.`);
    return;
  }
  console.log(`\nRestored ${result.written} documents into ${where} "${projectId}".`);
  for (const [col, n] of Object.entries(result.byCollection)) console.log(`  ${col}: ${n}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
