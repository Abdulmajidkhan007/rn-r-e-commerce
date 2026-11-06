/**
 * Decides whether the home-page hero may load its 3D decoration or must stay on
 * the static CSS fallback. Pure on purpose: `readDecorEnvironment` collects the
 * browser facts, `decideHeroDecorMode` only applies the rules (unit-tested).
 */

export type HeroDecorMode = '3d' | 'static';

export interface DecorEnvironment {
  prefersReducedMotion: boolean;
  /** `navigator.connection.saveData` — the user asked for lighter pages. */
  saveData: boolean;
  /** Logical CPU cores; `undefined` when the browser does not tell. */
  hardwareConcurrency: number | undefined;
  /** `navigator.deviceMemory` in GB (Chromium only); `undefined` elsewhere. */
  deviceMemoryGb: number | undefined;
  /** A hardware-accelerated WebGL context could be created. */
  webgl: boolean;
}

/** At or below these the device counts as weak and gets the static decor. */
export const MIN_CORES = 4;
export const MIN_MEMORY_GB = 4;

export function decideHeroDecorMode(env: DecorEnvironment): HeroDecorMode {
  if (env.prefersReducedMotion || env.saveData || !env.webgl) return 'static';
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency < MIN_CORES) return 'static';
  if (env.deviceMemoryGb !== undefined && env.deviceMemoryGb < MIN_MEMORY_GB) return 'static';
  return '3d';
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/**
 * Probes for a WebGL context that is not software-rendered
 * (`failIfMajorPerformanceCaveat`), then releases it immediately.
 */
function hasHardwareWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options);
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function readDecorEnvironment(): DecorEnvironment {
  const nav = navigator as Navigator & NavigatorHints;
  return {
    prefersReducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
    saveData: nav.connection?.saveData === true,
    hardwareConcurrency: nav.hardwareConcurrency || undefined,
    deviceMemoryGb: nav.deviceMemory,
    webgl: hasHardwareWebgl(),
  };
}
