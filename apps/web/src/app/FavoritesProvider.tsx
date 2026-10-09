import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@kidswear/auth';
import { useFavorites, type FavoritesState } from '@kidswear/data';

const FavoritesContext = createContext<FavoritesState | null>(null);

/**
 * One live favorites subscription for the whole app — product cards read it
 * from context instead of each opening its own Firestore listener.
 */
export function FavoritesProvider({ children }: { children: ReactNode }): ReactNode {
  const { user } = useAuth();
  const state = useFavorites(user?.uid);
  return <FavoritesContext.Provider value={state}>{children}</FavoritesContext.Provider>;
}

export function useFavoritesContext(): FavoritesState {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavoritesContext must be used inside FavoritesProvider');
  return ctx;
}
