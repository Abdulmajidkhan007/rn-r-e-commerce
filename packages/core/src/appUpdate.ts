import { z } from 'zod';

/**
 * settings/app — public read, admin write. The APK release workflow merges the
 * `latest*` fields (Admin SDK) after publishing; the admin sets `minVersionCode`
 * to force old installs to update. Every field is optional so a half-filled
 * document never breaks the app.
 */
export const AppSettingsSchema = z.object({
  /** versionCode of the newest published APK (= the GitHub Actions run number). */
  latestVersionCode: z.number().int().nonnegative().optional(),
  /** Human-readable version of that APK, e.g. "1.0.42". */
  latestVersionName: z.string().max(40).optional(),
  /** Direct download link of the newest APK. */
  apkUrl: z.url().optional(),
  /** Installs below this versionCode must update before they can be used. */
  minVersionCode: z.number().int().nonnegative().optional(),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

/**
 * Compares dotted numeric versions ("1.0.9" < "1.0.10"). Missing parts count
 * as 0; a non-numeric part is read as 0. Returns -1, 0 or 1.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string): number[] =>
    v.split('.').map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Parses the build-time version code; anything but a positive integer is "unknown" (0). */
export function parseVersionCode(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type AppUpdateState =
  | { kind: 'none' }
  | { kind: 'banner'; latestVersionName: string | undefined; apkUrl: string }
  | { kind: 'forced'; latestVersionName: string | undefined; apkUrl: string };

/**
 * What the Android app should show.
 * - `installed` 0 = unknown (a dev build): never nag.
 * - No download link → nothing to offer, so nothing is shown (not even forced:
 *   a blocking screen without a way out would lock customers out).
 * - `forced` when installed < minVersionCode; `banner` when installed < latest
 *   and that latest has not been dismissed in this session.
 */
export function evaluateAppUpdate(
  installed: number,
  settings: AppSettings | null | undefined,
  dismissedLatest?: number,
): AppUpdateState {
  if (installed <= 0 || !settings?.apkUrl) return { kind: 'none' };
  const { apkUrl, latestVersionName, latestVersionCode, minVersionCode } = settings;
  if (minVersionCode !== undefined && installed < minVersionCode) {
    return { kind: 'forced', latestVersionName, apkUrl };
  }
  if (
    latestVersionCode !== undefined &&
    installed < latestVersionCode &&
    dismissedLatest !== latestVersionCode
  ) {
    return { kind: 'banner', latestVersionName, apkUrl };
  }
  return { kind: 'none' };
}
