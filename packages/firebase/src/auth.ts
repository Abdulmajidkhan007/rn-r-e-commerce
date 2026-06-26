import {
  type User,
  type Unsubscribe,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirebase } from './app';
import { upsertUserProfile } from './users';

/** Custom claims we care about. `role` is set out-of-band (admin script). */
export interface AuthClaims {
  role?: string;
}

/**
 * Creates a Firebase user, sets the display name, and writes the mirror
 * profile doc with role 'customer'. Role is never client-elevatable — Firestore
 * rules enforce it regardless of what is sent here.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const { auth } = getFirebase();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await upsertUserProfile({
    uid: cred.user.uid,
    email,
    displayName,
    role: 'customer',
    addresses: [],
  });
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { auth } = getFirebase();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebase().auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebase().auth, email);
}

/** Subscribes to auth state changes; returns an unsubscribe function. */
export function onAuthChange(cb: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebase().auth, cb);
}

/** Reads the current user's custom claims with a forced token refresh. */
export async function getCurrentClaims(): Promise<AuthClaims> {
  const { auth } = getFirebase();
  const user = auth.currentUser;
  if (!user) return {};
  const result = await getIdTokenResult(user, true);
  const role = result.claims['role'];
  return { role: typeof role === 'string' ? role : undefined };
}

export type { User } from 'firebase/auth';
