import type { UserProfile } from '@kidswear/core';
import { type User, getCurrentClaims, getUserProfile, upsertUserProfile } from '@kidswear/firebase';
import type { AuthenticatedPayload } from '@kidswear/store';

/**
 * Loads the authenticated session for a Firebase user: fetches the profile
 * (creating a default one if missing) and resolves admin status from claims.
 * Shared by the action hooks and the bootstrap subscription.
 */
export async function loadSession(user: User): Promise<AuthenticatedPayload> {
  let profile: UserProfile | null = await getUserProfile(user.uid);

  if (!profile) {
    await upsertUserProfile({
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      role: 'customer',
      addresses: [],
    });
    profile = await getUserProfile(user.uid);
  }

  // Fallback profile if the read still races (e.g. emulator latency).
  const resolved: UserProfile = profile ?? {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    role: 'customer',
    addresses: [],
    createdAt: Date.now(),
  };

  const claims = await getCurrentClaims();
  return { user: resolved, isAdmin: claims.role === 'admin' };
}
