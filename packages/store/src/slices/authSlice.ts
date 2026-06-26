import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '@kidswear/core';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: UserProfile | null;
  /** Derived from the Firebase custom claim `role === 'admin'`, not from the profile. */
  isAdmin: boolean;
  status: AuthStatus;
  /** i18n message key for the last auth error, or null. */
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAdmin: false,
  status: 'idle',
  error: null,
};

export interface AuthenticatedPayload {
  user: UserProfile;
  isAdmin: boolean;
}

/**
 * Plain (thunk-free) auth slice. Orchestration lives in @kidswear/auth to keep
 * this package free of firebase imports and avoid circular dependencies.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = 'loading';
      state.error = null;
    },
    setAuthenticated(state, action: PayloadAction<AuthenticatedPayload>) {
      state.user = action.payload.user;
      state.isAdmin = action.payload.isAdmin;
      state.status = 'authenticated';
      state.error = null;
    },
    setUnauthenticated(state) {
      state.user = null;
      state.isAdmin = false;
      state.status = 'unauthenticated';
    },
    setAuthError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = 'unauthenticated';
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
});

export const {
  setAuthLoading,
  setAuthenticated,
  setUnauthenticated,
  setAuthError,
  clearAuthError,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
