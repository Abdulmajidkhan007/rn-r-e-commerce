import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import { useTheme } from '@mui/material/styles';
import {
  REDUCED_MOTION_QUERY,
  decideHeroDecorMode,
  readDecorEnvironment,
  type HeroDecorMode,
} from './capability';
import { DecorErrorBoundary } from './DecorErrorBoundary';
import { HeroDecorFallback } from './HeroDecorFallback';

/** three.js + R3F live in their own chunk, fetched only when actually used. */
const HeroScene = lazy(() => import('./HeroScene'));

/** Upper bound for waiting on an idle slot before loading anyway. */
const IDLE_TIMEOUT_MS = 2500;

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const getReducedMotion = (): boolean => window.matchMedia(REDUCED_MOTION_QUERY).matches;

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const getPageVisible = (): boolean => document.visibilityState === 'visible';

/** Runs `task` after the page `load` event and the next idle slot. */
function afterLoadAndIdle(task: () => void): () => void {
  let cancelled = false;
  let idleHandle: number | undefined;
  const run = (): void => {
    if (cancelled) return;
    idleHandle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS })
        : window.setTimeout(task, 200);
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', run);
    if (idleHandle === undefined) return;
    if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle);
    else window.clearTimeout(idleHandle);
  };
}

export interface HeroDecorProps {
  /** The hero element: its pointer movement tilts the scene. */
  eventSource: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Decorative, `aria-hidden` layer behind the hero copy. The hero text and CTA
 * render without it; the 3D chunk is requested only once the hero is on screen,
 * the page has loaded and the browser is idle — so it never competes with LCP.
 */
export function HeroDecor({ eventSource, className = '' }: HeroDecorProps): React.ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<HeroDecorMode | 'pending'>('pending');
  const [inView, setInView] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, getPageVisible, () => false);
  const scheme = useTheme().palette.mode;

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    let cancelLoad: (() => void) | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry?.isIntersecting ?? false;
      setInView(visible);
      if (visible && !cancelLoad) {
        cancelLoad = afterLoadAndIdle(() => setMode(decideHeroDecorMode(readDecorEnvironment())));
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelLoad?.();
    };
  }, []);

  const fallback = <HeroDecorFallback />;
  const show3d = mode === '3d' && !reducedMotion;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      data-decor-mode={show3d ? '3d' : 'static'}
    >
      {show3d ? (
        <DecorErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <div className="absolute inset-0 motion-safe:animate-hero-fade-in">
              <HeroScene active={inView && pageVisible} scheme={scheme} eventSource={eventSource} />
            </div>
          </Suspense>
        </DecorErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
