/**
 * Backup → wipe → restore against the Firestore emulator, through the real
 * CLIs (scripts/backup-firestore.ts, scripts/restore-firestore.ts).
 * Runs with `npm run test:rules` (needs FIRESTORE_EMULATOR_HOST).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { GeoPoint, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';

const PROJECT = process.env['GCLOUD_PROJECT'] ?? 'kidswear-rules-test';
const PASS = 'emulator-only passphrase, 32+ chars long';
const ROOT = resolve(__dirname, '../..');
// Own collection names: the rules tests share this emulator project.
const COLS = ['bk_products', 'bk_orders'];

let app: App;
let db: Firestore;
let dir: string;

function cli(script: string, args: string[], passphrase = PASS) {
  const res = spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, BACKUP_PASSPHRASE: passphrase, GCLOUD_PROJECT: PROJECT },
  });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

async function seed(): Promise<void> {
  await db.doc('bk_products/p1').set({
    name: { uz: 'Koʻylak', ru: 'Платье' },
    price: 125_000,
    sizes: ['92', '98'],
    createdAt: Timestamp.fromMillis(1_700_000_000_123),
  });
  await db.doc('bk_products/p2').set({ name: { uz: 'Shim' }, price: 90_000, isActive: false });
  await db.doc('bk_orders/o1').set({
    product: db.doc('bk_products/p1'),
    where: new GeoPoint(41.31, 69.28),
    phone: '+998901234567',
  });
  await db.doc('bk_orders/o1/events/e1').set({ status: 'pending', at: Timestamp.fromMillis(5) });
  // A parent that exists only through its sub-collection.
  await db.doc('bk_orders/ghost/events/e1').set({ status: 'orphan' });
}

async function dump(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const walk = async (path: string): Promise<void> => {
    const col = db.collection(path);
    for (const ref of await col.listDocuments()) {
      const snap = await ref.get();
      if (snap.exists) out[ref.path] = snap.data();
      for (const sub of await ref.listCollections()) await walk(sub.path);
    }
  };
  for (const c of COLS) await walk(c);
  return out;
}

async function wipe(): Promise<void> {
  for (const c of COLS) await db.recursiveDelete(db.collection(c));
}

beforeAll(async () => {
  app = initializeApp({ projectId: PROJECT }, 'backup-restore-test');
  db = getFirestore(app);
  dir = mkdtempSync(join(tmpdir(), 'kw-backup-'));
  await wipe();
  await seed();
});

afterAll(async () => {
  await wipe();
  await deleteApp(app);
  rmSync(dir, { recursive: true, force: true });
});

describe('encrypted backup → restore (emulator)', () => {
  it('backs up, wipes, restores — data is identical', async () => {
    const before = await dump();
    expect(Object.keys(before)).toHaveLength(5);

    const file = join(dir, 'b.kwbk');
    const backup = cli('backup-firestore.ts', [
      file,
      '--project',
      PROJECT,
      '--collections',
      COLS.join(','),
    ]);
    expect(backup.out).toContain('Verified');
    expect(backup.code).toBe(0);
    expect(readFileSync(file).includes(Buffer.from('+998901234567'))).toBe(false);

    await wipe();
    expect(await dump()).toEqual({});

    const dry = cli('restore-firestore.ts', [file, '--project', PROJECT]);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain('DRY RUN');
    expect(await dump()).toEqual({});

    const restore = cli('restore-firestore.ts', [file, '--project', PROJECT, '--confirm', PROJECT]);
    expect(restore.out).toContain('Restored 5 documents');
    expect(restore.code).toBe(0);

    const after = await dump();
    expect(after).toEqual(before);
    const order = after['bk_orders/o1'] as { product: { path: string }; where: GeoPoint };
    expect(order.product.path).toBe('bk_products/p1');
    expect(order.where.isEqual(new GeoPoint(41.31, 69.28))).toBe(true);
  });

  it('refuses a wrong passphrase and a mismatched project', () => {
    const file = join(dir, 'c.kwbk');
    expect(
      cli('backup-firestore.ts', [file, '--project', PROJECT, '--collections', 'bk_products']).code,
    ).toBe(0);

    const wrong = cli(
      'restore-firestore.ts',
      [file, '--project', PROJECT, '--confirm', PROJECT],
      `${PASS}x`,
    );
    expect(wrong.code).toBe(1);
    expect(wrong.out).toMatch(/wrong passphrase/);

    const other = cli('restore-firestore.ts', [
      file,
      '--project',
      'another-project',
      '--confirm',
      'another-project',
    ]);
    expect(other.code).toBe(1);
    expect(other.out).toMatch(/allow-other-project/);
  });
});
