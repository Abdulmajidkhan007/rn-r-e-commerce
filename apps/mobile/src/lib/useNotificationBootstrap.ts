import { useEffect, useRef } from 'react';
import { useAuth } from '@kidswear/auth';
import { useAppDispatch, useAppSelector, setExpoPushToken } from '@kidswear/store';
import { setUserLanguage } from '@kidswear/firebase';
import type { SupportedLanguage } from '@kidswear/i18n';
import type { UserLanguage } from '@kidswear/core';
import { registerForPushNotifications } from './push';

/**
 * Mobile-only bootstrap hook. Call once near the app root (inside
 * StoreProvider + auth context).
 *
 * - Registers for push notifications when the user is authenticated, push is
 *   enabled and no token is cached yet.
 * - Mirrors the active UI language to Firestore so Cloud Functions can
 *   localise push copy.
 */
export function useNotificationBootstrap(): void {
  const dispatch = useAppDispatch();
  const { status, user } = useAuth();
  const enabled = useAppSelector((s) => s.notifications.enabled);
  const expoToken = useAppSelector((s) => s.notifications.expoToken);
  const uiLanguage = useAppSelector((s) => s.ui.language);

  // Track the last language we synced so we don't spam Firestore on every render.
  const syncedLanguageRef = useRef<SupportedLanguage | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;

    const uid = user.uid;

    // 1. Register push token when enabled but not yet cached.
    if (enabled && expoToken === null) {
      void registerForPushNotifications(uid).then((token) => {
        if (token !== null) {
          dispatch(setExpoPushToken(token));
        }
      });
    }

    // 2. Mirror UI language to Firestore when it differs from the stored value.
    const storedLanguage: UserLanguage | undefined = user.language;
    if (uiLanguage !== syncedLanguageRef.current && uiLanguage !== storedLanguage) {
      syncedLanguageRef.current = uiLanguage;
      void setUserLanguage(uid, uiLanguage).catch((err: unknown) => {
        console.warn('[push] setUserLanguage failed:', err);
      });
    } else if (storedLanguage === undefined && syncedLanguageRef.current !== uiLanguage) {
      // First login — stored language is absent; always sync once.
      syncedLanguageRef.current = uiLanguage;
      void setUserLanguage(uid, uiLanguage).catch((err: unknown) => {
        console.warn('[push] setUserLanguage failed:', err);
      });
    }
  }, [status, user, enabled, expoToken, uiLanguage, dispatch]);
}
