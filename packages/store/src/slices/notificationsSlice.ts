import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Per-device notifications preferences. The flag gates whether the app should
 * register a push token at sign-in; the cached token lets us un-register the
 * exact token on opt-out without re-asking the OS.
 */
export interface NotificationsState {
  enabled: boolean;
  /** Last token we registered for the current device, kept for clean opt-out. */
  expoToken: string | null;
  fcmToken: string | null;
}

const initialState: NotificationsState = {
  enabled: true,
  expoToken: null,
  fcmToken: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    setExpoPushToken(state, action: PayloadAction<string | null>) {
      state.expoToken = action.payload;
    },
    setFcmPushToken(state, action: PayloadAction<string | null>) {
      state.fcmToken = action.payload;
    },
  },
});

export const { setNotificationsEnabled, setExpoPushToken, setFcmPushToken } =
  notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
