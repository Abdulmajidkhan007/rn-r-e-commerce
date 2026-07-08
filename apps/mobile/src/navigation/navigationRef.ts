import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Module-level navigation ref so code outside the component tree (e.g. push
 * notification tap handlers) can navigate. Always guard with `isReady()`
 * before calling — the ref is only attached once `<NavigationContainer>` mounts.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
