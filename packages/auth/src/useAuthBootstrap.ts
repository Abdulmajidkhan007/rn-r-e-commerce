import { useEffect } from 'react';
import { onAuthChange } from '@kidswear/firebase';
import { useAppDispatch, setAuthenticated, setUnauthenticated } from '@kidswear/store';
import { loadSession } from './session';

/**
 * Installs the single app-root auth subscription. On a signed-in user it loads
 * the session (profile + claims, creating a default profile if missing) and
 * marks the store authenticated; on sign-out it marks unauthenticated. Call
 * exactly once near the root.
 */
export function useAuthBootstrap(): void {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        if (active) dispatch(setUnauthenticated());
        return;
      }
      void loadSession(user)
        .then((session) => {
          if (active) dispatch(setAuthenticated(session));
        })
        .catch(() => {
          if (active) dispatch(setUnauthenticated());
        });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [dispatch]);
}
