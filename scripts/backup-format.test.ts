import { describe, expect, it } from 'vitest';
import { FieldValue, Firestore, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  decodeValue,
  decryptBackup,
  encodeValue,
  encryptBackup,
  type BackupSnapshot,
  type KdfParams,
} from './lib/backup-format.ts';

// No network: a Firestore instance is only used to build references.
const db = new Firestore({ projectId: 'backup-unit-test' });
const PASS = 'correct horse battery staple 2026';
const FAST: KdfParams = { log2N: 10, r: 8, p: 1 };

const snapshot = (data: Record<string, unknown>): BackupSnapshot => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  projectId: 'p',
  createdAt: '2026-11-04T00:00:00.000Z',
  documents: [
    { path: 'orders/o1', data: encodeValue(data) as BackupSnapshot['documents'][0]['data'] },
  ],
});

describe('backup value codec', () => {
  it('round-trips every Firestore type exactly', () => {
    const value = {
      s: 'Koʻylak — кофта',
      n: 12.5,
      i: 7,
      b: false,
      nul: null,
      nan: Number.NaN,
      inf: Number.POSITIVE_INFINITY,
      ts: new Timestamp(1_700_000_000, 123_456_789),
      geo: new GeoPoint(41.31, 69.28),
      ref: db.doc('users/u1'),
      bytes: Buffer.from([0, 1, 2, 255]),
      vec: FieldValue.vector([0.5, 1, 2]),
      arr: [1, 'a', { nested: new Timestamp(1, 2) }],
      map: { deep: { deeper: [null, true] } },
      $t: 'a real field named $t',
    };
    const encoded = encodeValue(value);
    // Survives JSON (what the file stores).
    const decoded = decodeValue(JSON.parse(JSON.stringify(encoded)), db) as typeof value;

    expect(decoded.s).toBe(value.s);
    expect(decoded.n).toBe(12.5);
    expect(decoded.nan).toBeNaN();
    expect(decoded.inf).toBe(Number.POSITIVE_INFINITY);
    expect((decoded.ts as Timestamp).isEqual(value.ts)).toBe(true);
    expect((decoded.geo as GeoPoint).isEqual(value.geo)).toBe(true);
    expect((decoded.ref as typeof value.ref).path).toBe('users/u1');
    expect(Buffer.compare(decoded.bytes as Buffer, value.bytes)).toBe(0);
    expect((decoded.vec as unknown as { toArray(): number[] }).toArray()).toEqual([0.5, 1, 2]);
    expect((decoded.arr[2] as { nested: Timestamp }).nested.isEqual(new Timestamp(1, 2))).toBe(
      true,
    );
    expect(decoded.map).toEqual(value.map);
    expect(decoded.$t).toBe('a real field named $t');
  });

  it('refuses values it cannot represent instead of dropping them', () => {
    expect(() => encodeValue({ d: new Date() })).toThrow(/Unsupported/);
    expect(() => decodeValue({ $t: 'nope' }, db)).toThrow(/Unknown backup value tag/);
  });
});

describe('backup encryption', () => {
  const snap = snapshot({ phone: '+998901234567', total: 125_000 });

  it('decrypts with the right passphrase', () => {
    const file = encryptBackup(snap, PASS, FAST);
    expect(decryptBackup(file, PASS)).toEqual(snap);
  });

  it('does not contain the plaintext', () => {
    const file = encryptBackup(snap, PASS, FAST);
    expect(file.includes(Buffer.from('+998901234567'))).toBe(false);
    expect(file.includes(Buffer.from('orders/o1'))).toBe(false);
  });

  it('uses a fresh salt and IV every time', () => {
    const a = encryptBackup(snap, PASS, FAST);
    const b = encryptBackup(snap, PASS, FAST);
    expect(a.equals(b)).toBe(false);
  });

  it('fails on a wrong passphrase', () => {
    const file = encryptBackup(snap, PASS, FAST);
    expect(() => decryptBackup(file, `${PASS}!`)).toThrow(
      /wrong passphrase or the file was modified/,
    );
  });

  it('fails when the ciphertext or the header is modified', () => {
    const body = encryptBackup(snap, PASS, FAST);
    body[body.length - 20] = (body[body.length - 20] ?? 0) ^ 1;
    expect(() => decryptBackup(body, PASS)).toThrow(/modified/);

    const header = encryptBackup(snap, PASS, FAST);
    header[15] = (header[15] ?? 0) ^ 1; // a salt byte (authenticated as AAD)
    expect(() => decryptBackup(header, PASS)).toThrow(/modified/);
  });

  it('rejects short passphrases and foreign files', () => {
    expect(() => encryptBackup(snap, 'short', FAST)).toThrow(/BACKUP_PASSPHRASE/);
    expect(() => decryptBackup(Buffer.from('not a backup at all, definitely not'), PASS)).toThrow(
      /Not a KidsWear backup/,
    );
  });

  it('works with the default (production) scrypt cost', () => {
    const file = encryptBackup(snap, PASS);
    expect(file[9]).toBe(17); // log2N in the header
    expect(decryptBackup(file, PASS)).toEqual(snap);
  });
});
