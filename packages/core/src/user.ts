import { z } from 'zod';
import { AddressSchema } from './address';
import { TimestampSchema } from './product';

export const UserRoleSchema = z.enum(['customer', 'admin']);

export type UserRole = z.infer<typeof UserRoleSchema>;

/** Active language for server-side push copy. Mirrors @kidswear/i18n's locales. */
export const UserLanguageSchema = z.enum(['uz', 'en', 'ru']);
export type UserLanguage = z.infer<typeof UserLanguageSchema>;

/**
 * Per-user push tokens, fanned out by Cloud Functions. FCM is the only channel
 * on both platforms. Profiles written before the Expo removal may still carry a
 * legacy `expo` array; zod strips unknown keys, so those are ignored on read
 * and simply go stale — no migration needed.
 */
export const PushTokensSchema = z.object({
  fcm: z.array(z.string()).default([]),
});
export type PushTokens = z.infer<typeof PushTokensSchema>;

export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  role: UserRoleSchema,
  addresses: z.array(AddressSchema),
  createdAt: TimestampSchema,
  language: UserLanguageSchema.optional(),
  pushTokens: PushTokensSchema.optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
