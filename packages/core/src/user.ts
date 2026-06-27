import { z } from 'zod';
import { AddressSchema } from './address';
import { TimestampSchema } from './product';

export const UserRoleSchema = z.enum(['customer', 'admin']);

export type UserRole = z.infer<typeof UserRoleSchema>;

/** Active language for server-side push copy. Mirrors @kidswear/i18n's locales. */
export const UserLanguageSchema = z.enum(['uz', 'en', 'ru']);
export type UserLanguage = z.infer<typeof UserLanguageSchema>;

/** Per-user push tokens, fanned out by Cloud Functions. */
export const PushTokensSchema = z.object({
  expo: z.array(z.string()).default([]),
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
