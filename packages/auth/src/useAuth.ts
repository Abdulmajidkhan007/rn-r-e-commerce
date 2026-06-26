import { useAppSelector } from '@kidswear/store';
import type { UserProfile } from '@kidswear/core';
import type { AuthStatus } from '@kidswear/store';

export interface AuthView {
  user: UserProfile | null;
  isAdmin: boolean;
  status: AuthStatus;
  isAuthenticated: boolean;
}

/** Read-only view of the auth state for components. */
export function useAuth(): AuthView {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = useAppSelector((s) => s.auth.isAdmin);
  const status = useAppSelector((s) => s.auth.status);
  return { user, isAdmin, status, isAuthenticated: status === 'authenticated' };
}
