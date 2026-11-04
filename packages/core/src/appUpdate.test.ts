import { describe, expect, it } from 'vitest';
import {
  AppSettingsSchema,
  compareVersions,
  evaluateAppUpdate,
  parseVersionCode,
  type AppSettings,
} from './appUpdate';

const apkUrl = 'https://example.com/kidswear.apk';
const settings: AppSettings = { latestVersionCode: 42, latestVersionName: '1.0.42', apkUrl };

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('1.0.9', '1.0.10')).toBe(-1);
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });
  it('treats missing parts as 0 and equal versions as equal', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBe(-1);
  });
  it('reads garbage parts as 0', () => {
    expect(compareVersions('1.x.3', '1.0.3')).toBe(0);
  });
});

describe('parseVersionCode', () => {
  it('accepts positive integers, everything else is unknown (0)', () => {
    expect(parseVersionCode('42')).toBe(42);
    expect(parseVersionCode(undefined)).toBe(0);
    expect(parseVersionCode('')).toBe(0);
    expect(parseVersionCode('abc')).toBe(0);
    expect(parseVersionCode('-3')).toBe(0);
  });
});

describe('evaluateAppUpdate', () => {
  it('shows a banner when the install is older than the latest release', () => {
    expect(evaluateAppUpdate(40, settings)).toEqual({
      kind: 'banner',
      latestVersionName: '1.0.42',
      apkUrl,
    });
  });
  it('shows nothing when up to date or newer', () => {
    expect(evaluateAppUpdate(42, settings).kind).toBe('none');
    expect(evaluateAppUpdate(43, settings).kind).toBe('none');
  });
  it('hides the banner once that version was dismissed, but not a newer one', () => {
    expect(evaluateAppUpdate(40, settings, 42).kind).toBe('none');
    expect(evaluateAppUpdate(40, { ...settings, latestVersionCode: 43 }, 42).kind).toBe('banner');
  });
  it('forces the update below the admin minimum, even if dismissed', () => {
    const forced = { ...settings, minVersionCode: 41 };
    expect(evaluateAppUpdate(40, forced, 42).kind).toBe('forced');
    expect(evaluateAppUpdate(41, forced).kind).toBe('banner');
    expect(evaluateAppUpdate(41, forced, 42).kind).toBe('none');
  });
  it('never nags unknown (dev) builds', () => {
    expect(evaluateAppUpdate(0, { ...settings, minVersionCode: 99 }).kind).toBe('none');
  });
  it('shows nothing without settings or a download link (no dead-end lock screen)', () => {
    expect(evaluateAppUpdate(1, null).kind).toBe('none');
    expect(evaluateAppUpdate(1, undefined).kind).toBe('none');
    expect(evaluateAppUpdate(1, { latestVersionCode: 42, minVersionCode: 40 }).kind).toBe('none');
  });
});

describe('AppSettingsSchema', () => {
  it('accepts a partial document and rejects a bad link', () => {
    expect(AppSettingsSchema.safeParse({}).success).toBe(true);
    expect(AppSettingsSchema.safeParse({ apkUrl: 'not a url' }).success).toBe(false);
  });
});
