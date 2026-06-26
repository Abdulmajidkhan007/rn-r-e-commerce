/**
 * @kidswear/store — Redux Toolkit store, slices, and typed hooks.
 *
 * `makeStore(storage)` lets each platform inject its own persistence engine.
 * Only the cart and ui slices are persisted.
 */
export { makeStore } from './store';
export type { PersistStorage, MakeStoreResult, AppStore, AppDispatch } from './store';

export { rootReducer } from './rootReducer';
export type { RootState } from './rootReducer';

export { useAppDispatch, useAppSelector, useAppStore } from './hooks';

// Slices: reducers + actions + state types
export {
  authReducer,
  setAuthLoading,
  setAuthenticated,
  setUnauthenticated,
  setAuthError,
  clearAuthError,
} from './slices/authSlice';
export type { AuthState, AuthStatus, AuthenticatedPayload } from './slices/authSlice';

export { cartReducer, addItem, removeItem, updateQty, clearCart } from './slices/cartSlice';
export type { CartState, UpdateQtyPayload, RemoveItemPayload } from './slices/cartSlice';

export { uiReducer, setTheme, toggleTheme, setLanguage } from './slices/uiSlice';
export type { UiState, ThemePreference } from './slices/uiSlice';

// Re-export react-redux Provider for convenience.
export { Provider as ReduxProvider } from 'react-redux';
