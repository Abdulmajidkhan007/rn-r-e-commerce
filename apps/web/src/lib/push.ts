/**
 * push.ts — FCM web push helpers.
 *
 * All entry points are wrapped in try/catch and never throw; errors are
 * console.warn-ed so the app never crashes due to push-related failures.
 */

import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import { getFirebase } from '@kidswear/firebase';
import { addPushToken, removePushToken } from '@kidswear/firebase';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (err) {
    console.warn('[push] Service worker registration failed:', err);
    return null;
  }
}

async function ensurePermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Requests notification permission, registers the service worker, obtains an
 * FCM token, and persists it in the user's Firestore profile.
 * Returns the token on success, or null on any failure (never throws).
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    if (!(await ensurePermission())) return null;

    const reg = await registerServiceWorker();
    if (!reg) return null;

    // Ensure Firebase app is initialized before calling getMessaging.
    getFirebase();
    const messaging = getMessaging();

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[push] No VAPID key — set VITE_FIREBASE_VAPID_KEY');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: reg,
    });

    await addPushToken(uid, 'fcm', token);
    return token;
  } catch (err) {
    console.warn('[push] registerForPushNotifications failed:', err);
    return null;
  }
}

/**
 * Removes the FCM token from Firestore and unregisters it from the FCM service.
 * Best-effort: swallows all errors.
 */
export async function unregisterPushToken(uid: string, token: string): Promise<void> {
  try {
    await removePushToken(uid, 'fcm', token);
  } catch (err) {
    console.warn('[push] removePushToken failed:', err);
  }
  try {
    getFirebase();
    await deleteToken(getMessaging());
  } catch {
    // best-effort
  }
}

/**
 * Subscribes to foreground FCM messages. Also shows a native Notification if
 * permission is granted. Returns an unsubscribe function (safe to call even if
 * messaging is not supported).
 */
export function attachForegroundListener(
  onPayload: (p: { title: string; body: string; data: Record<string, string> }) => void,
): () => void {
  const noop = (): void => undefined;

  try {
    // Ensure Firebase is initialized. If getFirebase() throws the app is not
    // yet set up — return the noop unsubscriber.
    getFirebase();
  } catch {
    return noop;
  }

  try {
    const messaging = getMessaging();
    const unsub = onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'KidsWear';
      const body = payload.notification?.body ?? '';
      const data = Object.fromEntries(
        Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)]),
      );
      onPayload({ title, body, data });
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    });
    return unsub;
  } catch (err) {
    console.warn('[push] attachForegroundListener failed:', err);
    return noop;
  }
}

/**
 * Shows an immediate native Notification for local testing.
 * Throws if Notification API is unavailable or permission is not granted.
 */
export async function sendTestNotification(title: string, body: string): Promise<void> {
  if (!('Notification' in window)) throw new Error('Notification API not supported');
  if (Notification.permission !== 'granted') throw new Error('Notification permission not granted');
  new Notification(title, { body });
}
