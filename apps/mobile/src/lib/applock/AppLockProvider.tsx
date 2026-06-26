import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@kidswear/auth';
import { getEnabled, getLabel, isAvailable, type BiometricLabel } from '@/lib/biometric';

/** Re-lock if the app was backgrounded longer than this. */
const RELOCK_AFTER_MS = 30_000;

export interface AppLockValue {
  locked: boolean;
  label: BiometricLabel;
  /** One-time notice key (e.g. biometric enabled but no longer available). */
  notice: string | null;
  unlock: () => void;
  clearNotice: () => void;
  /** Re-read the SecureStore flag + availability (after toggling in settings). */
  refresh: () => void;
}

const AppLockContext = createContext<AppLockValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }): ReactNode {
  const { isAuthenticated } = useAuth();
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState<BiometricLabel>('Biometrics');
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const backgroundedAt = useRef<number | null>(null);

  /** Evaluates whether the session should start locked. */
  const evaluate = useCallback(async (): Promise<void> => {
    // Read external systems (auth + SecureStore/biometric) first so every state
    // update lands in the async continuation, not synchronously in the effect.
    const authed = isAuthenticated;
    const [en, avail] = await Promise.all([
      authed ? getEnabled() : Promise.resolve(false),
      authed ? isAvailable() : Promise.resolve(false),
    ]);
    const nextLabel = authed && en && avail ? await getLabel() : null;

    setEnabled(en);
    setAvailable(avail);
    if (nextLabel) setLabel(nextLabel);

    if (authed && en && avail) {
      setLocked(true);
    } else if (authed && en && !avail) {
      // Never trap the user: auto-unlock and surface a one-time notice.
      setNotice('security.biometricNotAvailable');
      setLocked(false);
    } else {
      setLocked(false);
    }
  }, [isAuthenticated]);

  // Cold-launch / sign-in evaluation. This effect synchronizes lock state from
  // external systems (auth + SecureStore/biometric); `evaluate` only sets state
  // after awaiting those reads, so the cascading-render warning is a false
  // positive for this one-shot external read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async external sync; setState runs post-await
    void evaluate();
  }, [evaluate]);

  // Re-lock after a long background stint.
  useEffect(() => {
    const onChange = (state: AppStateStatus): void => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (
          isAuthenticated &&
          enabled &&
          available &&
          since !== null &&
          Date.now() - since > RELOCK_AFTER_MS
        ) {
          setLocked(true);
        }
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
    };
  }, [isAuthenticated, enabled, available]);

  const unlock = useCallback(() => {
    setLocked(false);
  }, []);
  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);
  const refresh = useCallback(() => {
    void evaluate();
  }, [evaluate]);

  return (
    <AppLockContext.Provider value={{ locked, label, notice, unlock, clearNotice, refresh }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) {
    throw new Error('useAppLock must be used within <AppLockProvider>');
  }
  return ctx;
}
