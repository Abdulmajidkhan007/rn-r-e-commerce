import { doc, getDoc, serverTimestamp, setDoc, type WithFieldValue } from 'firebase/firestore';
import type { ProductImage } from '@kidswear/core';
import {
  INLINE_IMAGE_MAX_DATA_URL_CHARS,
  ImageTooLargeError,
  inlineImageRef,
  parseInlineImageRef,
} from '@kidswear/utils';
import { productImagesCol } from './collections';
import { uploadProductImage } from './storage';

/**
 * Where new product photos go.
 * - `firestore`: Spark plan — the project has no Storage bucket, so the
 *   compressed JPEG is a `productImages` document and the product stores
 *   `kwimg:<id>`.
 * - `storage`: Blaze — Cloud Storage, the product stores the download URL.
 *
 * Switching to `storage` only affects new uploads; existing `kwimg:` refs keep
 * resolving, so nothing has to be migrated at the same time.
 */
export type ProductImageBackend = 'firestore' | 'storage';
export const PRODUCT_IMAGE_BACKEND: ProductImageBackend = 'firestore';

/**
 * An already-compressed JPEG. Platforms build it (canvas on web,
 * image-resizer on Android) because reading a Blob as base64 needs their
 * FileReader, which this package's ES-only lib does not type.
 */
export interface EncodedImage {
  /** Encoded size in bytes. */
  size: number;
  blob: () => Promise<Blob>;
  dataUrl: () => Promise<string>;
}

/** Saves the nth photo of a product and returns the string to put in `images`. */
export async function saveProductImage(
  productId: string,
  index: number,
  image: EncodedImage,
): Promise<string> {
  if (PRODUCT_IMAGE_BACKEND === 'storage') {
    return uploadProductImage(productId, index, await image.blob());
  }

  const dataUrl = await image.dataUrl();
  if (dataUrl.length > INLINE_IMAGE_MAX_DATA_URL_CHARS) throw new ImageTooLargeError(image.size);

  const ref = doc(productImagesCol());
  const value: WithFieldValue<ProductImage> = {
    id: ref.id,
    productId,
    dataUrl,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, value);
  return inlineImageRef(ref.id);
}

/** Resolves a `kwimg:` ref to its data URL; null if it is not one or is gone. */
export async function getInlineImage(src: string): Promise<string | null> {
  const id = parseInlineImageRef(src);
  if (!id) return null;
  const snap = await getDoc(doc(productImagesCol(), id));
  return snap.exists() ? snap.data().dataUrl : null;
}
