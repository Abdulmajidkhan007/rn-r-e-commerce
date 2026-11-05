import { describe, expect, it } from 'vitest';
import { decideHeroDecorMode, type DecorEnvironment } from './capability';

const capable: DecorEnvironment = {
  prefersReducedMotion: false,
  saveData: false,
  hardwareConcurrency: 8,
  deviceMemoryGb: 8,
  webgl: true,
};

describe('decideHeroDecorMode', () => {
  it('loads 3D on a capable device', () => {
    expect(decideHeroDecorMode(capable)).toBe('3d');
  });

  it('loads 3D when the browser hides cores and memory', () => {
    expect(
      decideHeroDecorMode({
        ...capable,
        hardwareConcurrency: undefined,
        deviceMemoryGb: undefined,
      }),
    ).toBe('3d');
  });

  it.each<[string, Partial<DecorEnvironment>]>([
    ['reduced motion', { prefersReducedMotion: true }],
    ['data saver', { saveData: true }],
    ['no hardware WebGL', { webgl: false }],
    ['few cores', { hardwareConcurrency: 2 }],
    ['little memory', { deviceMemoryGb: 2 }],
  ])('falls back to static on %s', (_, override) => {
    expect(decideHeroDecorMode({ ...capable, ...override })).toBe('static');
  });
});
