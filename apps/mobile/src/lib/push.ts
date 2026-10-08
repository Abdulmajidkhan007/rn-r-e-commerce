import { Platform } from 'react-native';
import messaging, { AuthorizationStatus } from '@react-native-firebase/messaging';
import notifee, { EventType, type EventDetail } from '@notifee/react-native';
import { addPushToken, removePushToken } from '@kidswear/firebase';

/**
 * Configures the FCM background message handler (a no-op — notifee displays
 * are handled by the foreground listener in `attachNotificationListeners`)
 * and, on Android, creates the default notifee notification channel. Safe to
 * call multiple times.
 */
export function configureNotifications(): void {
  messaging().setBackgroundMessageHandler(async () => {
    // Intentional no-op: display is handled via notifee's foreground/
    // background event listeners wired up in attachNotificationListeners.
  });

  if (Platform.OS === 'android') {
    void notifee.createChannel({ id: 'default', name: 'Default' });
  }
}

/**
 * Requests notification permission via FCM and, on Android 13+, via notifee
 * (covers POST_NOTIFICATIONS). Returns true when permission is effectively
 * granted on either check.
 */
export async function ensurePermission(): Promise<boolean> {
  const fcmStatus = await messaging().requestPermission();
  const fcmGranted =
    fcmStatus === AuthorizationStatus.AUTHORIZED || fcmStatus === AuthorizationStatus.PROVISIONAL;

  let notifeeGranted = true;
  if (Platform.OS === 'android') {
    const settings = await notifee.requestPermission();
    notifeeGranted = settings.authorizationStatus >= 1;
  }

  return fcmGranted || notifeeGranted;
}

/**
 * Registers the device for FCM push notifications. Persists the token under
 * the user's Firestore profile. Returns the token string or null on failure.
 *
 * All errors are swallowed and warned, so callers never crash.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  try {
    configureNotifications();

    const granted = await ensurePermission();
    if (!granted) return null;

    const token = await messaging().getToken();
    await addPushToken(uid, 'fcm', token);
    return token;
  } catch (err) {
    console.warn('[push] registerForPushNotifications failed:', err);
    return null;
  }
}

/**
 * Removes the FCM push token from the user's Firestore profile and, on a
 * best-effort basis, deletes the local FCM token. Errors are swallowed.
 */
export async function unregisterPushToken(uid: string, token: string): Promise<void> {
  try {
    await removePushToken(uid, 'fcm', token);
  } catch (err) {
    console.warn('[push] unregisterPushToken failed:', err);
  }

  try {
    await messaging().deleteToken();
  } catch (err) {
    console.warn('[push] messaging().deleteToken() failed:', err);
  }
}

/** Extracts a non-empty string `orderId` from a remote message's data payload. */
function extractOrderId(data: Record<string, unknown> | undefined): string | null {
  const orderId = data?.['orderId'];
  return typeof orderId === 'string' && orderId.length > 0 ? orderId : null;
}

/**
 * Attaches listeners that navigate to the relevant order when the user taps a
 * push notification (from the background, from a killed state, or a notifee
 * foreground event) that contains an `orderId` in its data. Also displays
 * foreground FCM messages via notifee so they're visible to the user.
 *
 * Returns a single cleanup function that unsubscribes everything.
 */
export function attachNotificationListeners(onOrderTap: (orderId: string) => void): () => void {
  const unsubOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
    const orderId = extractOrderId(remoteMessage.data);
    if (orderId) onOrderTap(orderId);
  });

  void messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      const orderId = extractOrderId(remoteMessage?.data);
      if (orderId) onOrderTap(orderId);
    });

  const unsubForegroundEvent = notifee.onForegroundEvent(({ type, detail }: { type: EventType; detail: EventDetail }) => {
    if (type !== EventType.PRESS) return;
    const orderId = extractOrderId(detail.notification?.data as Record<string, unknown> | undefined);
    if (orderId) onOrderTap(orderId);
  });

  const unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
    const { title, body } = remoteMessage.notification ?? {};
    if (!title && !body) return;
    await notifee.displayNotification({
      title,
      body,
      data: remoteMessage.data,
      android: { channelId: 'default' },
    });
  });

  return () => {
    unsubOpenedApp();
    unsubForegroundEvent();
    unsubOnMessage();
  };
}

/**
 * Displays an immediate local notification for testing purposes.
 */
export async function sendTestNotification(title: string, body: string): Promise<void> {
  await notifee.displayNotification({
    title,
    body,
    android: { channelId: 'default', smallIcon: 'ic_launcher' },
  });
}
