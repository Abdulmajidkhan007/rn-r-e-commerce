/**
 * Firestore backup file format — pure, no network.
 *
 *   plaintext  = gzip(JSON(BackupSnapshot))       values tagged so that
 *                                                 Timestamp/GeoPoint/refs/bytes
 *                                                 round-trip exactly
 *   file       = header ‖ AES-256-GCM(plaintext) ‖ tag(16)
 *   header     = "KWBACKUP" ‖ version(1) ‖ log2N(1) ‖ r(1) ‖ p(1) ‖ salt(16) ‖ iv(12)
 *   key        = scrypt(passphrase, salt, N, r, p) → 32 bytes
 *
 * The header is authenticated as GCM additional data, so tampering with the
 * KDF parameters, salt or IV fails decryption just like tampering with the
 * ciphertext. A wrong passphrase also fails (GCM tag mismatch) — there is no
 * way to get partial or garbage plaintext out.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  DocumentReference,
  FieldValue,
  GeoPoint,
  Timestamp,
  type Firestore,
} from 'firebase-admin/firestore';

export const BACKUP_FORMAT = 'kidswear-firestore-backup';
export const BACKUP_VERSION = 1;
/** Shorter than this is refused — it is the only thing guarding the data. */
export const MIN_PASSPHRASE_LENGTH = 24;

const MAGIC = Buffer.from('KWBACKUP', 'ascii');
const FILE_VERSION = 1;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = MAGIC.length + 4 + SALT_LEN + IV_LEN;

/** scrypt cost. N = 2^17, r = 8 → 128 MiB of memory per derivation. */
export interface KdfParams {
  log2N: number;
  r: number;
  p: number;
}
export const DEFAULT_KDF: KdfParams = { log2N: 17, r: 8, p: 1 };

export interface BackupDocument {
  /** Full document path, e.g. `products/p1` or `orders/o1/items/i1`. */
  path: string;
  data: Record<string, EncodedValue>;
}

export interface BackupSnapshot {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  projectId: string;
  createdAt: string;
  documents: BackupDocument[];
}

export type EncodedValue =
  | null
  | boolean
  | number
  | string
  | EncodedValue[]
  | { [key: string]: EncodedValue };

const TAG = '$t';

// ---------------------------------------------------------------- values

/** Firestore value → JSON-safe value. Unknown classes throw (never silently dropped). */
export function encodeValue(value: unknown): EncodedValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : { [TAG]: 'num', v: String(value) };
  }
  if (Array.isArray(value)) return value.map(encodeValue);
  if (value instanceof Timestamp) {
    return { [TAG]: 'ts', s: value.seconds, n: value.nanoseconds };
  }
  if (value instanceof GeoPoint) {
    return { [TAG]: 'geo', lat: value.latitude, lng: value.longitude };
  }
  if (value instanceof DocumentReference) return { [TAG]: 'ref', path: value.path };
  // VectorValue is not exported as a runtime class by firebase-admin.
  if (isVector(value)) return { [TAG]: 'vec', v: value.toArray() };
  if (value instanceof Uint8Array) {
    return { [TAG]: 'bytes', b64: Buffer.from(value).toString('base64') };
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => [k, encodeValue(v)] as const,
    );
    const map = Object.fromEntries(entries) as Record<string, EncodedValue>;
    // A real field named "$t" must not be mistaken for a type tag.
    return TAG in map ? { [TAG]: 'map', v: map } : map;
  }
  throw new TypeError(`Unsupported Firestore value: ${Object.prototype.toString.call(value)}`);
}

/** Shape of firebase-admin's VectorValue (not exported as a runtime class). */
interface VectorLike {
  toArray(): number[];
}

function isVector(value: unknown): value is VectorLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.constructor?.name === 'VectorValue' &&
    typeof (value as Partial<VectorLike>).toArray === 'function'
  );
}

/** Inverse of {@link encodeValue}. `db` is needed to rebuild document references. */
export function decodeValue(value: EncodedValue, db: Firestore): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => decodeValue(v, db));
  const tag = value[TAG];
  if (tag === undefined) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeValue(v, db)]));
  }
  switch (tag) {
    case 'num':
      return Number(value['v']);
    case 'ts':
      return new Timestamp(value['s'] as number, value['n'] as number);
    case 'geo':
      return new GeoPoint(value['lat'] as number, value['lng'] as number);
    case 'ref':
      return db.doc(value['path'] as string);
    case 'vec':
      return FieldValue.vector(value['v'] as number[]);
    case 'bytes':
      return Buffer.from(value['b64'] as string, 'base64');
    case 'map':
      return Object.fromEntries(
        Object.entries(value['v'] as Record<string, EncodedValue>).map(([k, v]) => [
          k,
          decodeValue(v, db),
        ]),
      );
    default:
      throw new TypeError(`Unknown backup value tag: ${String(tag)}`);
  }
}

// ---------------------------------------------------------------- crypto

export function assertPassphrase(passphrase: string | undefined): asserts passphrase is string {
  if (!passphrase || passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `BACKUP_PASSPHRASE is missing or shorter than ${MIN_PASSPHRASE_LENGTH} characters`,
    );
  }
}

function deriveKey(passphrase: string, salt: Buffer, kdf: KdfParams): Buffer {
  const N = 2 ** kdf.log2N;
  return scryptSync(passphrase, salt, 32, {
    N,
    r: kdf.r,
    p: kdf.p,
    maxmem: 128 * N * kdf.r * 2,
  });
}

export function encryptBackup(
  snapshot: BackupSnapshot,
  passphrase: string,
  kdf: KdfParams = DEFAULT_KDF,
): Buffer {
  assertPassphrase(passphrase);
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const header = Buffer.concat([
    MAGIC,
    Buffer.from([FILE_VERSION, kdf.log2N, kdf.r, kdf.p]),
    salt,
    iv,
  ]);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(passphrase, salt, kdf), iv);
  cipher.setAAD(header);
  const body = Buffer.concat([
    cipher.update(gzipSync(Buffer.from(JSON.stringify(snapshot), 'utf8'))),
    cipher.final(),
  ]);
  return Buffer.concat([header, body, cipher.getAuthTag()]);
}

export function decryptBackup(file: Buffer, passphrase: string): BackupSnapshot {
  assertPassphrase(passphrase);
  if (file.length < HEADER_LEN + TAG_LEN || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Not a KidsWear backup file');
  }
  const [version, log2N, r, p] = file.subarray(MAGIC.length, MAGIC.length + 4);
  if (version !== FILE_VERSION) throw new Error(`Unsupported backup file version ${version}`);
  if (!log2N || !r || !p || log2N > 20 || r > 16 || p > 4) {
    throw new Error('Backup header has invalid KDF parameters');
  }
  const header = file.subarray(0, HEADER_LEN);
  const salt = header.subarray(MAGIC.length + 4, MAGIC.length + 4 + SALT_LEN);
  const iv = header.subarray(HEADER_LEN - IV_LEN);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKey(passphrase, salt, { log2N, r, p }),
    iv,
  );
  decipher.setAAD(header);
  decipher.setAuthTag(file.subarray(file.length - TAG_LEN));
  let plain: Buffer;
  try {
    plain = Buffer.concat([
      decipher.update(file.subarray(HEADER_LEN, file.length - TAG_LEN)),
      decipher.final(),
    ]);
  } catch {
    throw new Error('Decryption failed: wrong passphrase or the file was modified');
  }
  const snapshot = JSON.parse(gunzipSync(plain).toString('utf8')) as BackupSnapshot;
  if (snapshot.format !== BACKUP_FORMAT || snapshot.version !== BACKUP_VERSION) {
    throw new Error('Decrypted data is not a supported backup snapshot');
  }
  return snapshot;
}
