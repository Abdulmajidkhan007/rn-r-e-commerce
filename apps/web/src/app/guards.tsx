import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@kidswear/store';

/**
 * Requires an authenticated user. Phase 0: allow-all stub.
 * TODO(auth): redirect unauthenticated users to /login once auth lands.
 */
export function RequireAuth({ children }: { children: ReactNode }): ReactNode {
  const status = useAppSelector((s) => s.auth.status);
  // TODO(auth): enforce when real auth exists.
  const allowAll = true;
  if (!allowAll && status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * Requires an admin user. Phase 0: allow-all stub.
 * TODO(auth): gate on user.role === 'admin' once auth lands.
 */
export function RequireAdmin({ children }: { children: ReactNode }): ReactNode {
  const role = useAppSelector((s) => s.auth.user?.role);
  // TODO(auth): enforce when real auth exists.
  const allowAll = true;
  if (!allowAll && role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}
