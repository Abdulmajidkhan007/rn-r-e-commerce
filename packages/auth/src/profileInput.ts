import type { UserProfile } from '@kidswear/core';
import type { UserProfileInput } from '@kidswear/firebase';

/** Builds the write-input (no createdAt) from a full profile, dropping empty optionals. */
export function toProfileInput(user: UserProfile): UserProfileInput {
  const input: UserProfileInput = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    addresses: user.addresses,
  };
  if (user.phone) input.phone = user.phone;
  if (user.avatarUrl) input.avatarUrl = user.avatarUrl;
  return input;
}
