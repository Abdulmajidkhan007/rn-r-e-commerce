/**
 * Reads a whole Firestore database (all collections, all sub-collections) into
 * a {@link BackupSnapshot}, and writes one back. Admin SDK only — security
 * rules do not apply, so this runs only in GitHub Actions or locally against
 * the emulator.
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import {
  getFirestore,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  decodeValue,
  encodeValue,
  type BackupDocument,
  type BackupSnapshot,
} from './backup-format.ts';

const READ_CHUNK = 300;

export interface ExportOptions {
  /** Only these top-level collections (default: all). */
  collections?: readonly string[];
}

export interface ImportOptions extends ExportOptions {
  /** Count what would be written, write nothing. */
  dryRun?: boolean;
}

export interface ImportResult {
  written: number;
  skipped: number;
  byCollection: Record<string, number>;
}

/**
 * Emulator when FIRESTORE_EMULATOR_HOST is set (projectId required), otherwise
 * the service-account key in GOOGLE_APPLICATION_CREDENTIALS. Returns the
 * database and the project it really points at.
 */
export function connectAdmin(projectId?: string): { db: Firestore; projectId: string } {
  if (process.env['FIRESTORE_EMULATOR_HOST']) {
    const id = projectId ?? process.env['GCLOUD_PROJECT'];
    if (!id) throw new Error('Emulator mode needs --project <id> (or GCLOUD_PROJECT)');
    initializeApp({ projectId: id });
    return { db: getFirestore(), projectId: id };
  }
  const keyPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
  if (!keyPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set');
  const key = JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount & {
    project_id?: string;
  };
  const keyProject = key.projectId ?? key.project_id;
  if (!keyProject) throw new Error('Service-account key has no project_id');
  initializeApp({ credential: cert(key), projectId: keyProject });
  return { db: getFirestore(), projectId: keyProject };
}

const topLevel = (path: string): string => path.split('/')[0] ?? '';

async function exportCollection(col: CollectionReference, out: BackupDocument[]): Promise<void> {
  // listDocuments() also returns "missing" parents that only hold
  // sub-collections — getAll() reports them as !exists, but we still recurse.
  const refs = await col.listDocuments();
  for (let i = 0; i < refs.length; i += READ_CHUNK) {
    const chunk = refs.slice(i, i + READ_CHUNK);
    const snaps = chunk.length ? await col.firestore.getAll(...chunk) : [];
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = encodeValue(snap.data()) as BackupDocument['data'];
      out.push({ path: snap.ref.path, data });
    }
  }
  for (const ref of refs) {
    for (const sub of await ref.listCollections()) await exportCollection(sub, out);
  }
}

export async function exportFirestore(
  db: Firestore,
  projectId: string,
  options: ExportOptions = {},
): Promise<BackupSnapshot> {
  const wanted = options.collections ? new Set(options.collections) : null;
  const documents: BackupDocument[] = [];
  for (const col of await db.listCollections()) {
    if (wanted && !wanted.has(col.id)) continue;
    await exportCollection(col, documents);
  }
  documents.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    projectId,
    createdAt: new Date().toISOString(),
    documents,
  };
}

/**
 * Writes every document of the snapshot with `set()` (full overwrite of that
 * document). Documents that exist in the database but not in the backup are
 * left untouched — restore never deletes.
 */
export async function importFirestore(
  db: Firestore,
  snapshot: BackupSnapshot,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const wanted = options.collections ? new Set(options.collections) : null;
  const result: ImportResult = { written: 0, skipped: 0, byCollection: {} };
  const writer = options.dryRun ? null : db.bulkWriter();
  const failed: string[] = [];
  for (const doc of snapshot.documents) {
    const col = topLevel(doc.path);
    if (wanted && !wanted.has(col)) {
      result.skipped++;
      continue;
    }
    const ref: DocumentReference = db.doc(doc.path);
    if (writer) {
      // Handle each rejection right away (BulkWriter retries transient errors
      // itself); an unhandled one would crash Node before close() returns.
      writer
        .set(ref, decodeValue(doc.data, db) as Record<string, unknown>)
        .catch(() => failed.push(doc.path));
    }
    result.written++;
    result.byCollection[col] = (result.byCollection[col] ?? 0) + 1;
  }
  if (writer) {
    await writer.close();
    if (failed.length) {
      throw new Error(`${failed.length} documents failed to write, e.g. ${failed[0]}`);
    }
  }
  return result;
}

/** Per top-level collection document counts — what the CLIs log (never data). */
export function summarize(snapshot: BackupSnapshot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const doc of snapshot.documents) {
    const col = topLevel(doc.path);
    counts[col] = (counts[col] ?? 0) + 1;
  }
  return counts;
}
