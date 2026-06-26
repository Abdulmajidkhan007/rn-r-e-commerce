import { z } from 'zod';

/**
 * Validation schemas for the auth forms. Messages are i18n keys (under
 * `auth.validation.*`) that the UI resolves with `t()`.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'auth.validation.emailRequired' })
    .email({ message: 'auth.validation.emailInvalid' }),
  password: z.string().min(1, { message: 'auth.validation.passwordRequired' }),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    displayName: z.string().min(2, { message: 'auth.validation.displayNameRequired' }),
    email: z
      .string()
      .min(1, { message: 'auth.validation.emailRequired' })
      .email({ message: 'auth.validation.emailInvalid' }),
    password: z.string().min(6, { message: 'auth.validation.passwordMin' }),
    confirmPassword: z.string().min(1, { message: 'auth.validation.confirmRequired' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.validation.passwordsMismatch',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'auth.validation.emailRequired' })
    .email({ message: 'auth.validation.emailInvalid' }),
});

export type ForgotValues = z.infer<typeof forgotSchema>;
