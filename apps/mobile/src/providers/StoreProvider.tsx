import { useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistGate } from 'redux-persist/integration/react';
import { ReduxProvider, makeStore } from '@kidswear/store';

/**
 * Provides the Redux store backed by AsyncStorage and gates rendering on
 * rehydration. The lazy initializer creates the store once.
 */
export function StoreProvider({ children }: { children: ReactNode }): ReactNode {
  const [{ store, persistor }] = useState(() => makeStore(AsyncStorage));

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </ReduxProvider>
  );
}
