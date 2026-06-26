import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '@kidswear/core';

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

export interface AuthState {
  user: UserProfile | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = 'loading';
    },
    setUser(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    clearUser(state) {
      state.user = null;
      state.status = 'unauthenticated';
    },
  },
});

export const { setAuthLoading, setUser, clearUser } = authSlice.actions;
export const authReducer = authSlice.reducer;
