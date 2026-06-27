import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Requests media-library (and optionally camera) permission BEFORE opening the
 * picker, avoiding the post-select iOS permission dialog.
 */
export async function ensurePermissions(camera = false): Promise<boolean> {
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) return false;
  if (camera) {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) return false;
  }
  return true;
}

export interface PickOptions {
  camera?: boolean;
}

/** Picks an image from the library or camera; returns its uri (or null). */
export async function pickImage({ camera = false }: PickOptions = {}): Promise<string | null> {
  const ok = await ensurePermissions(camera);
  if (!ok) return null;

  const result = camera
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

/**
 * Resizes and re-encodes an image to WebP using the NEW contextual
 * ImageManipulator API. WebP also normalizes iOS HEIC/AVIF sources.
 */
export async function processToWebp(uri: string, { maxW = 1080 } = {}): Promise<Blob> {
  const context = ImageManipulator.manipulate(uri).resize({ width: maxW });
  const image = await context.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.WEBP, compress: 0.8 });
  const response = await fetch(out.uri);
  return response.blob();
}
