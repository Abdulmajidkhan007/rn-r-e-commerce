import type { EncodedImage } from '@kidswear/firebase';
import { encodeWithinBudget, fitWithin } from '@kidswear/utils';

/** Opens a hidden file input and resolves the chosen image File (or null). */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}

export interface ProcessOptions {
  maxW?: number;
  maxH?: number;
  quality?: number;
}

/**
 * Resizes an image (contain within bounds) and encodes it as WebP via canvas.
 * WebP normalizes odd source formats and keeps uploads small.
 */
export async function processToWebp(
  file: File,
  { maxW = 1080, maxH = 1440, quality = 0.8 }: ProcessOptions = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) throw new Error('WebP encoding failed');
  return blob;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Unexpected FileReader result'));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses a product photo to a JPEG that fits the shared byte budget
 * (≈720–1080 px), walking the shared quality ladder. JPEG rather than WebP:
 * every Android WebView/Image decodes it, and it is what Storage will get too.
 */
export async function compressProductImage(file: File): Promise<EncodedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const blob = await encodeWithinBudget(async ({ maxSide, quality }) => {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      // JPEG has no alpha: paint transparent PNG areas white, not black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const out = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );
      if (!out) throw new Error('JPEG encoding failed');
      return out;
    });
    return { size: blob.size, blob: async () => blob, dataUrl: () => readAsDataUrl(blob) };
  } finally {
    bitmap.close();
  }
}
