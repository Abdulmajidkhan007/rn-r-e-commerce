import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from './slices/authSlice';
import { cartReducer } from './slices/cartSlice';
import { notificationsReducer } from './slices/notificationsSlice';
import { uiReducer } from './slices/uiSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  notifications: notificationsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
