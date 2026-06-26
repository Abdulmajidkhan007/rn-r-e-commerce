import {
  type DocumentData,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type QueryDocumentSnapshot,
  type SetOptions,
  type SnapshotOptions,
  type WithFieldValue,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { ZodType } from 'zod';

/** Fields the converter manages itself; callers never write them directly. */
const MANAGED_TIMESTAMP_FIELDS = ['createdAt', 'updatedAt'] as const;

/** Shallowly maps any Firestore `Timestamp` value to epoch millis. */
function timestampsToMillis(data: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value instanceof Timestamp ? value.toMillis() : value;
  }
  return out;
}

/** Removes the id field and any `undefined` values before writing. */
function stripForWrite(data: DocumentData, idField: string): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === idField) continue;
    if (value === undefined) continue;
    if ((MANAGED_TIMESTAMP_FIELDS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out;
}

export interface ConverterOptions {
  /** Name of the field that holds the document id. Defaults to `id` (users use `uid`). */
  idField?: string;
}

/**
 * Builds a typed Firestore converter from a Zod schema (the single source of
 * truth). On read it injects the document id, maps Timestamps -> millis, and
 * validates with the schema. On write it strips the id and undefined values and
 * stamps `createdAt`/`updatedAt` with `serverTimestamp()`.
 */
export function createConverter<T>(
  schema: ZodType<T>,
  options: ConverterOptions = {},
): FirestoreDataConverter<T> {
  const idField = options.idField ?? 'id';

  return {
    toFirestore(
      model: WithFieldValue<T> | PartialWithFieldValue<T>,
      _options?: SetOptions,
    ): DocumentData {
      const data = stripForWrite(model as DocumentData, idField);
      return {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, snapshotOptions?: SnapshotOptions): T {
      const raw = snapshot.data(snapshotOptions);
      const normalized = timestampsToMillis(raw);
      return schema.parse({ ...normalized, [idField]: snapshot.id });
    },
  };
}
