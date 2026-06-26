import { z } from 'zod';
import { AddressSchema } from './address';
import { TimestampSchema } from './product';

export const UserRoleSchema = z.enum(['customer', 'admin']);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  role: UserRoleSchema,
  addresses: z.array(AddressSchema),
  createdAt: TimestampSchema,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
