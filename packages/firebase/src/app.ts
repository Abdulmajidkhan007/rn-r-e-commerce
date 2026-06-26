import { type FirebaseApp, type FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { type Auth, type Persistence, initializeAuth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { type FirebaseStorage, getStorage } from 'firebase/storage';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

export interface InitFirebaseOptions {
  /** Each app reads its own env and passes the config here; the package never reads env. */
  config: FirebaseOptions;
  /**
   * Auth persistence injected by the platform:
   * - web: `browserLocalPersistence`
   * - mobile: `getReactNativePersistence(AsyncStorage)`
   */
  persistence: Persistence | Persistence[];
}

let services: FirebaseServices | null = null;

/**
 * Initializes Firebase once and returns the shared services. Safe to call
 * multiple times — subsequent calls return the already-initialized instance.
 */
export function initFirebase({ config, persistence }: InitFirebaseOptions): FirebaseServices {
  if (services) {
    return services;
  }

  const app = getApps()[0] ?? initializeApp(config);
  const auth = initializeAuth(app, { persistence });
  const db = getFirestore(app);
  const storage = getStorage(app);

  services = { app, auth, db, storage };
  return services;
}

/** Returns the initialized Firebase services, throwing if `initFirebase` was not called. */
export function getFirebase(): FirebaseServices {
  if (!services) {
    throw new Error(
      '[@kidswear/firebase] Firebase is not initialized. Call initFirebase({ config, persistence }) at app bootstrap before using any data-access function.',
    );
  }
  return services;
}

/** Convenience accessor for the Firestore instance. */
export function getDb(): Firestore {
  return getFirebase().db;
}
