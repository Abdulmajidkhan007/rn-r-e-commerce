import AsyncStorage from '@react-native-async-storage/async-storage';
// getReactNativePersistence is a valid runtime export of firebase/auth's React
// Native build (Metro resolves it), but it is missing from the default
// browser-oriented type declarations — hence this single, documented ts-ignore.
// @ts-ignore -- firebase/auth RN-only export not present in browser typings
import { getReactNativePersistence } from 'firebase/auth';
import { getCategories, initFirebase, type FirebaseOptions } from '@kidswear/firebase';

const config: FirebaseOptions = {
  apiKey: process.env.RN_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.RN_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.RN_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.RN_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.RN_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.RN_PUBLIC_FIREBASE_APP_ID ?? '',
  ...(process.env.RN_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.RN_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

/** Initializes Firebase for mobile using AsyncStorage-backed auth persistence. */
export const firebase = initFirebase({
  config,
  persistence: getReactNativePersistence(AsyncStorage),
});

// Phase 1 wiring smoke (dev only): proves the shared data layer is callable.
// Safe to remove once real screens consume the data layer.
if (__DEV__) {
  void getCategories()
    .then((categories) => {
      console.info(`[firebase] data layer OK — ${categories.length} categories`);
    })
    .catch((error: unknown) => {
      console.warn('[firebase] getCategories smoke failed (expected without backend):', error);
    });
}
