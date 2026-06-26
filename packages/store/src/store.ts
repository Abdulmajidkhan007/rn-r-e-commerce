import { configureStore, type Store } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  type Persistor,
  type Storage,
} from 'redux-persist';
import { rootReducer, type RootState } from './rootReducer';

/**
 * Storage engine passed in by each platform:
 * - web: redux-persist's localStorage engine
 * - mobile: `@react-native-async-storage/async-storage`
 */
export type PersistStorage = Storage;

const PERSIST_KEY = 'kidswear';

/** Only cart + ui are persisted; auth is rehydrated from the backend later. */
const PERSIST_WHITELIST: (keyof RootState)[] = ['cart', 'ui'];

export interface MakeStoreResult {
  store: Store<RootState>;
  persistor: Persistor;
}

/**
 * Creates a configured Redux store with redux-persist wired to the given
 * storage engine. Returns both the store and its persistor.
 */
export function makeStore(storage: PersistStorage): MakeStoreResult {
  const persistConfig = {
    key: PERSIST_KEY,
    version: 1,
    storage,
    whitelist: PERSIST_WHITELIST as string[],
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);

  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });

  const persistor = persistStore(store);

  return { store, persistor };
}

export type AppStore = MakeStoreResult['store'];
export type AppDispatch = AppStore['dispatch'];
