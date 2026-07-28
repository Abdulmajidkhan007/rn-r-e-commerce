import { type FirebaseApp, type FirebaseOptions, getApps, initializeApp } from 'firebase/app';
import { type Auth, type Persistence, connectAuthEmulator, initializeAuth } from 'firebase/auth';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { type FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';

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
  /**
   * Point the SDK at local emulators instead of the real project. Lets the apps
   * run with seeded data and no cloud credentials — and guarantees a dev
   * session cannot write to production by accident.
   */
  emulators?: {
    host?: string;
    firestorePort?: number;
    authPort?: number;
    storagePort?: number;
  };
}

let services: FirebaseServices | null = null;

/**
 * Initializes Firebase once and returns the shared services. Safe to call
 * multiple times — subsequent calls return the already-initialized instance.
 */
export function initFirebase({
  config,
  persistence,
  emulators,
}: InitFirebaseOptions): FirebaseServices {
  if (services) {
    return services;
  }

  const app = getApps()[0] ?? initializeApp(config);
  const auth = initializeAuth(app, { persistence });
  const db = getFirestore(app);
  const storage = getStorage(app);

  if (emulators) {
    const host = emulators.host ?? '127.0.0.1';
    connectFirestoreEmulator(db, host, emulators.firestorePort ?? 8080);
    connectAuthEmulator(auth, `http://${host}:${emulators.authPort ?? 9099}`, {
      disableWarnings: true,
    });
    connectStorageEmulator(storage, host, emulators.storagePort ?? 9199);
  }

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
