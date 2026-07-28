import { useState, type ReactNode } from 'react';
import { PersistGate } from 'redux-persist/integration/react';
import { ReduxProvider, makeStore } from '@kidswear/store';
import { webStorage } from './webStorage';

/**
 * Provides the Redux store backed by the browser's localStorage engine, and
 * gates rendering on rehydration. The lazy initializer creates the store once.
 */
export function StoreProvider({ children }: { children: ReactNode }): ReactNode {
  const [{ store, persistor }] = useState(() => makeStore(webStorage));

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </ReduxProvider>
  );
}
