import type { ReactNode } from 'react';
import { LockScreen } from '@/components/LockScreen';
import { useAppLock } from './AppLockProvider';

/** Renders the lock screen while locked, otherwise the app. */
export function LockGate({ children }: { children: ReactNode }): ReactNode {
  const { locked } = useAppLock();
  return locked ? <LockScreen /> : children;
}
