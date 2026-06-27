/**
 * firebase-messaging-sw.js — FCM background message handler.
 *
 * IMPORTANT: The Firebase config values below are intentionally duplicated from
 * the app's .env because a Service Worker runs in a separate context and has no
 * access to import.meta.env (Vite does not bundle this file). For production
 * deploys you must either:
 *   (a) replace the placeholder strings below with your real Firebase config
 *       values, OR
 *   (b) generate this file at build time via a build script (out of scope here).
 *
 * Placeholder names match apps/web/.env.example for easy cross-reference.
 */

// Pin to the same major.minor.patch as the firebase npm package in apps/web/package.json.
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'KidsWear';
  const body = payload.notification?.body ?? '';
  const data = payload.data || {};
  self.registration.showNotification(title, {
    body,
    data,
    icon: '/favicon.ico',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const url = orderId ? `/orders/${orderId}` : '/';
  event.waitUntil(clients.openWindow(url));
});
