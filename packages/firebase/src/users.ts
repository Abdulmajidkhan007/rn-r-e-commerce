import {
  type DocumentData,
  type Unsubscribe,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { UserProfile } from '@kidswear/core';
import { getDb } from './app';
import { COLLECTIONS, userDoc } from './collections';
import type { UserProfileInput } from './types';

/** One-shot fetch of a user profile, or `null` if it does not exist. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? snap.data() : null;
}

function stripUndefined(data: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Creates or updates a user profile. `createdAt` is stamped only on first
 * write; subsequent upserts touch only `updatedAt`. Uses a plain (unconverted)
 * ref so the converter does not re-stamp `createdAt` on updates.
 */
export async function upsertUserProfile(profile: UserProfileInput): Promise<void> {
  const { uid, ...rest } = profile;
  const ref = doc(getDb(), COLLECTIONS.users, uid);
  const existing = await getDoc(ref);

  const payload: DocumentData = {
    ...stripUndefined(rest),
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(ref, payload, { merge: true });
}

/** Sets or clears the user's avatar URL (clear removes the field entirely). */
export async function setUserAvatar(uid: string, avatarUrl: string | null): Promise<void> {
  await updateDoc(userDoc(uid), {
    avatarUrl: avatarUrl ?? deleteField(),
    updatedAt: serverTimestamp(),
  });
}

/** Real-time subscription to a user profile. */
export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void,
): Unsubscribe {
  return onSnapshot(userDoc(uid), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}
