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
