import { Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import type { EncodedImage } from '@kidswear/firebase';
import { encodeWithinBudget } from '@kidswear/utils';

/**
 * react-native-image-picker prompts for the relevant OS permission itself
 * (media library / camera) when launched, so there is no separate
 * pre-flight permission step to perform here. Kept as a no-op async function
 * so callers that awaited a permission check before opening the picker keep
 * compiling unchanged.
 */
export async function ensurePermissions(_camera = false): Promise<boolean> {
  return true;
}

export interface PickOptions {
  camera?: boolean;
}

/** Picks an image from the library or camera; returns its uri (or null). */
export async function pickImage({ camera = false }: PickOptions = {}): Promise<string | null> {
  try {
    const result = camera
      ? await launchCamera({ mediaType: 'photo' })
      : await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });

    if (result.didCancel) return null;
    return result.assets?.[0]?.uri ?? null;
  } catch (err) {
    console.warn('[image] pickImage failed:', err);
    return null;
  }
}

/**
 * Resizes and re-encodes an image to WebP. Falls back to JPEG on iOS, since
 * WEBP output is Android-only in react-native-image-resizer (the project
 * ships Android-only, so this is an acceptable caveat).
 */
export async function processToWebp(uri: string, { maxW = 1080 } = {}): Promise<Blob> {
  const format = Platform.OS === 'ios' ? 'JPEG' : 'WEBP';
  const result = await ImageResizer.createResizedImage(uri, maxW, maxW * 1.25, format, 80);
  const response = await fetch(result.uri);
  return response.blob();
}

/** Reads a blob as a JPEG data URL (whatever MIME type fetch gave the file). */
function readAsJpegDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = typeof result === 'string' ? result.indexOf(',') : -1;
      if (typeof result !== 'string' || comma < 0) {
        reject(new Error('Unexpected FileReader result'));
        return;
      }
      // A file:// fetch may report an empty or generic type; the bytes are JPEG.
      resolve(`data:image/jpeg;base64,${result.slice(comma + 1)}`);
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses a product photo to a JPEG within the shared byte budget
 * (≈720–1080 px), walking the same quality ladder as the web admin.
 */
export async function compressProductImage(uri: string): Promise<EncodedImage> {
  const resized = await encodeWithinBudget(({ maxSide, quality }) =>
    ImageResizer.createResizedImage(
      uri,
      maxSide,
      maxSide,
      'JPEG',
      Math.round(quality * 100),
      0,
      null,
      false,
      { mode: 'contain', onlyScaleDown: true },
    ),
  );
  const blob = (): Promise<Blob> => fetch(resized.uri).then((r) => r.blob());
  return {
    size: resized.size,
    blob,
    dataUrl: async () => readAsJpegDataUrl(await blob()),
  };
}
