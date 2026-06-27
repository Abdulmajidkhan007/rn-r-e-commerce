import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { addPushToken, removePushToken } from '@kidswear/firebase';

/**
 * Configures the in-app notification display handler and (on Android) creates
 * the default notification channel. Safe to call multiple times.
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: true,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }
}

/**
 * Checks current permission status; requests if undetermined.
 * Returns true when permission is granted.
 */
export async function ensurePermission(): Promise<boolean> {
  const { status: current } = await Notifications.getPermissionsAsync();
  if (current === 'granted') return true;
  if (current === 'undetermined') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    return requested === 'granted';
  }
  return false;
}

/**
 * Registers the device for Expo push notifications. Persists the token under
 * the user's Firestore profile. Returns the token string or null on failure.
 *
 * All errors are swallowed and warned, so callers never crash.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[push] Push tokens are not available on simulators/emulators');
    return null;
  }

  try {
    configureNotifications();

    const granted = await ensurePermission();
    if (!granted) return null;

    const projectId: string | undefined =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('[push] No EAS projectId — push token not retrievable in this build');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await addPushToken(uid, 'expo', token);
    return token;
  } catch (err) {
    console.warn('[push] registerForPushNotifications failed:', err);
    return null;
  }
}

/**
 * Removes the Expo push token from the user's Firestore profile.
 * Errors are swallowed.
 */
export async function unregisterPushToken(uid: string, token: string): Promise<void> {
  try {
    await removePushToken(uid, 'expo', token);
  } catch (err) {
    console.warn('[push] unregisterPushToken failed:', err);
  }
}

/**
 * Attaches a listener that navigates to the relevant order screen when the
 * user taps a push notification that contains an `orderId` in its data.
 * Returns a cleanup function to call on unmount.
 */
export function attachNotificationListeners(router: {
  push: (href: string) => void;
}): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    const orderId = data['orderId'];
    if (typeof orderId === 'string' && orderId.length > 0) {
      router.push(`/orders/${orderId}`);
    }
  });

  return () => {
    subscription.remove();
  };
}

/**
 * Schedules an immediate local notification for testing purposes.
 */
export async function sendTestNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null,
  });
}
