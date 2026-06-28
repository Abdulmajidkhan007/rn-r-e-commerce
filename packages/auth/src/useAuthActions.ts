import { useCallback, useMemo } from 'react';
import {
  signInWithEmail,
  signInWithGoogleCredential,
  signOutUser,
  signUpWithEmail,
  sendPasswordReset,
} from '@kidswear/firebase';
import {
  useAppDispatch,
  setAuthLoading,
  setAuthenticated,
  setUnauthenticated,
  setAuthError,
  clearAuthError,
} from '@kidswear/store';
import { mapAuthError } from './mapAuthError';
import { loadSession } from './session';
import type { LoginValues, RegisterValues } from './schemas';

// AuthCredential is intentionally NOT re-exported from @kidswear/auth — both web and mobile
// already depend on firebase/auth directly, keeping the shared package free of firebase-specific types.
import type { AuthCredential } from 'firebase/auth';

export interface AuthActions {
  login: (values: LoginValues) => Promise<boolean>;
  register: (values: RegisterValues) => Promise<boolean>;
  loginWithGoogleCredential: (credential: AuthCredential) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}

/**
 * Auth orchestration: wraps the firebase auth functions, drives the auth slice,
 * and maps errors to i18n keys. Returns booleans so the UI can navigate on
 * success. This is the only place that ties firebase + store together.
 */
export function useAuthActions(): AuthActions {
  const dispatch = useAppDispatch();

  const login = useCallback(
    async ({ email, password }: LoginValues): Promise<boolean> => {
      dispatch(setAuthLoading());
      try {
        const user = await signInWithEmail(email, password);
        dispatch(setAuthenticated(await loadSession(user)));
        return true;
      } catch (error) {
        dispatch(setAuthError(mapAuthError(error)));
        return false;
      }
    },
    [dispatch],
  );

  const register = useCallback(
    async ({ displayName, email, password }: RegisterValues): Promise<boolean> => {
      dispatch(setAuthLoading());
      try {
        const user = await signUpWithEmail(email, password, displayName);
        dispatch(setAuthenticated(await loadSession(user)));
        return true;
      } catch (error) {
        dispatch(setAuthError(mapAuthError(error)));
        return false;
      }
    },
    [dispatch],
  );

  const loginWithGoogleCredential = useCallback(
    async (credential: AuthCredential): Promise<boolean> => {
      dispatch(setAuthLoading());
      try {
        const user = await signInWithGoogleCredential(credential);
        dispatch(setAuthenticated(await loadSession(user)));
        return true;
      } catch (error) {
        dispatch(setAuthError(mapAuthError(error)));
        return false;
      }
    },
    [dispatch],
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOutUser();
    dispatch(setUnauthenticated());
  }, [dispatch]);

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      try {
        await sendPasswordReset(email);
        dispatch(clearAuthError());
        return true;
      } catch (error) {
        dispatch(setAuthError(mapAuthError(error)));
        return false;
      }
    },
    [dispatch],
  );

  return useMemo(
    () => ({ login, register, loginWithGoogleCredential, logout, resetPassword }),
    [login, register, loginWithGoogleCredential, logout, resetPassword],
  );
}
