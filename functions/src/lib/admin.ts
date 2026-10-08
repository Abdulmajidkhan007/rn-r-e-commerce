import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

/**
 * The Admin SDK is initialized lazily so importing a trigger module (as the
 * Functions runtime does during discovery) never performs I/O at load time.
 */
function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

export function db(): Firestore {
  ensureApp();
  return getFirestore();
}

export function messaging(): Messaging {
  ensureApp();
  return getMessaging();
}
