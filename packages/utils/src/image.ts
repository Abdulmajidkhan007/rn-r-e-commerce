/**
 * Product images without Cloud Storage.
 *
 * On the Spark plan the project has no Storage bucket, so a product image is a
 * compressed JPEG written to its own Firestore document (`productImages/{id}`)
 * and the product keeps only a short reference: `kwimg:<id>`. Plain https URLs
 * keep working next to these refs, so switching back to Storage only changes
 * what new uploads return.
 */

export const INLINE_IMAGE_REF_PREFIX = 'kwimg:';

/**
 * Budget for one encoded JPEG, in bytes. Base64 inflates it by 4/3 → ≈400 KB
 * of text, well inside Firestore's 1 MiB document limit and cheap enough to
 * load on a product card over mobile data.
 */
export const INLINE_IMAGE_MAX_BYTES = 300_000;

/**
 * Longest data URL the Firestore rules accept. Derived from the byte budget
 * with headroom for the `data:image/jpeg;base64,` prefix; `firestore.rules`
 * repeats this number — keep them in sync.
 */
export const INLINE_IMAGE_MAX_DATA_URL_CHARS = 420_000;

export interface ImageEncodeStep {
  /** Longest side of the output, in px (aspect ratio is kept). */
  maxSide: number;
  /** JPEG quality, 0–1. */
  quality: number;
}

/** Tried in order until one fits the byte budget: best quality first. */
export const IMAGE_ENCODE_STEPS: readonly ImageEncodeStep[] = [
  { maxSide: 1080, quality: 0.8 },
  { maxSide: 1080, quality: 0.65 },
  { maxSide: 900, quality: 0.6 },
  { maxSide: 720, quality: 0.55 },
  { maxSide: 720, quality: 0.4 },
];

export class ImageTooLargeError extends Error {
  constructor(readonly bytes: number) {
    super(`Image is still ${bytes} bytes after the smallest encoding step`);
    this.name = 'ImageTooLargeError';
  }
}

/**
 * Runs `encode` through {@link IMAGE_ENCODE_STEPS} and returns the first result
 * whose `size` fits `maxBytes`. Each platform supplies its own encoder (canvas
 * on web, image-resizer on Android); the size ladder lives here once.
 */
export async function encodeWithinBudget<T extends { size: number }>(
  encode: (step: ImageEncodeStep) => Promise<T>,
  maxBytes: number = INLINE_IMAGE_MAX_BYTES,
  steps: readonly ImageEncodeStep[] = IMAGE_ENCODE_STEPS,
): Promise<T> {
  let lastSize = 0;
  for (const step of steps) {
    const result = await encode(step);
    if (result.size <= maxBytes) return result;
    lastSize = result.size;
  }
  throw new ImageTooLargeError(lastSize);
}

/** Scales `width`×`height` down (never up) so the longest side is ≤ `maxSide`. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const ratio = Math.min(maxSide / Math.max(width, height), 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function inlineImageRef(id: string): string {
  return `${INLINE_IMAGE_REF_PREFIX}${id}`;
}

/** The `productImages` document id of a `kwimg:` ref, or null for a plain URL. */
export function parseInlineImageRef(src: string): string | null {
  if (!src.startsWith(INLINE_IMAGE_REF_PREFIX)) return null;
  const id = src.slice(INLINE_IMAGE_REF_PREFIX.length);
  return id.length > 0 && !id.includes('/') ? id : null;
}
