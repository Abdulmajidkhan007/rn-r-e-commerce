import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@kidswear/auth';

/** Renders nothing while auth is still resolving, to avoid redirect flicker. */
function isResolving(status: string): boolean {
  return status === 'idle' || status === 'loading';
}

/**
 * Requires an authenticated user. Unauthenticated visitors are sent to /login
 * with the intended path preserved in router state.
 */
export function RequireAuth({ children }: { children: ReactNode }): ReactNode {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();

  if (isResolving(status)) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

/** Requires an admin (custom claim). Non-admins are redirected home. */
export function RequireAdmin({ children }: { children: ReactNode }): ReactNode {
  const { isAuthenticated, isAdmin, status } = useAuth();
  const location = useLocation();

  if (isResolving(status)) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}
