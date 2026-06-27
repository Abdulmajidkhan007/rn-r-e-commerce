import { useEffect } from 'react';
import { useAuth } from '@kidswear/auth';
import { useAppDispatch, useAppSelector, setFcmPushToken } from '@kidswear/store';
import { setUserLanguage } from '@kidswear/firebase';
import { registerForPushNotifications, attachForegroundListener } from './push';

/**
 * Bootstraps FCM web push for the current user. Call exactly once near the
 * app root (inside auth context). Safe to call unconditionally — all side
 * effects are no-ops when the user is not authenticated or push is disabled.
 */
export function useNotificationBootstrap(): void {
  const { status, user } = useAuth();
  const dispatch = useAppDispatch();
  const enabled = useAppSelector((s) => s.notifications.enabled);
  const fcmToken = useAppSelector((s) => s.notifications.fcmToken);
  const language = useAppSelector((s) => s.ui.language);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;

    const uid = user.uid;

    // Mirror active UI language to Firestore so Cloud Functions can send
    // localized push copy. Best-effort — swallow errors.
    setUserLanguage(uid, language).catch(() => undefined);

    // Register for push only if the user has opted in and we don't have a
    // token yet for this session.
    if (enabled && !fcmToken) {
      registerForPushNotifications(uid)
        .then((token) => {
          if (token) dispatch(setFcmPushToken(token));
        })
        .catch(() => undefined);
    }

    // Attach the foreground message listener and clean it up on unmount /
    // dependency change.
    const unsub = attachForegroundListener((_payload) => {
      // Foreground handler: a native Notification is already shown inside
      // attachForegroundListener. Optionally wire a toast here in future.
    });

    return unsub;
    // We intentionally omit fcmToken from deps: once a token is registered we
    // don't want to re-run merely because the cached value changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.uid, enabled]);
}
