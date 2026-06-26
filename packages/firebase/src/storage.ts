import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebase } from './app';

/** Canonical Storage object paths. Images are stored as `.webp`. */
export const storagePaths = {
  productImage: (productId: string, n: number): string => `product-images/${productId}/${n}.webp`,
  avatar: (uid: string): string => `avatars/${uid}.webp`,
} as const;

/** Binary payloads accepted by Firebase Storage uploads. */
export type UploadData = Blob | Uint8Array | ArrayBuffer;

async function upload(path: string, data: UploadData): Promise<string> {
  const storageRef = ref(getFirebase().storage, path);
  await uploadBytes(storageRef, data, { contentType: 'image/webp' });
  return getDownloadURL(storageRef);
}

/** Uploads the nth image for a product and returns its download URL. */
export function uploadProductImage(
  productId: string,
  n: number,
  data: UploadData,
): Promise<string> {
  return upload(storagePaths.productImage(productId, n), data);
}

/** Uploads a user's avatar and returns its download URL. */
export function uploadAvatar(uid: string, data: UploadData): Promise<string> {
  return upload(storagePaths.avatar(uid), data);
}

/** Resolves the public download URL for a stored object path. */
export function getDownloadUrl(path: string): Promise<string> {
  return getDownloadURL(ref(getFirebase().storage, path));
}

/** Deletes a stored object by path. */
export function deleteStorageObject(path: string): Promise<void> {
  return deleteObject(ref(getFirebase().storage, path));
}
