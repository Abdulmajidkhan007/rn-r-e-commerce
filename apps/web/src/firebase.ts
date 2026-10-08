import { browserLocalPersistence } from 'firebase/auth';
import { getCategories, initFirebase, type FirebaseOptions } from '@kidswear/firebase';

const env = import.meta.env;

const config: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  ...(env.VITE_FIREBASE_MEASUREMENT_ID ? { measurementId: env.VITE_FIREBASE_MEASUREMENT_ID } : {}),
};

/**
 * Initializes Firebase for the web app using browser localStorage persistence.
 *
 * With VITE_USE_FIREBASE_EMULATORS=true the SDK is pointed at local emulators
 * instead — the app then runs on seeded data with no cloud project, and cannot
 * write to production by accident.
 */
export const firebase = initFirebase({
  config,
  persistence: browserLocalPersistence,
  ...(env.VITE_USE_FIREBASE_EMULATORS === 'true' ? { emulators: {} } : {}),
});

// Phase 1 wiring smoke (dev only): proves the shared data layer is callable.
// Safe to remove once real screens consume the data layer. Empty result is OK;
// errors are swallowed so they never crash the app.
if (import.meta.env.DEV) {
  void getCategories()
    .then((categories) => {
      console.info(`[firebase] data layer OK — ${categories.length} categories`);
    })
    .catch((error: unknown) => {
      console.warn('[firebase] getCategories smoke failed (expected without backend):', error);
    });
}
