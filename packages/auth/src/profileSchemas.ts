import { z } from 'zod';

/** Loose Uzbek phone format, e.g. +998901234567 or 998901234567. */
const UZ_PHONE = /^\+?998\d{9}$/;

const optionalUzPhone = z
  .string()
  .regex(UZ_PHONE, { message: 'profile.validation.phoneInvalid' })
  .optional()
  .or(z.literal(''));

export const profileSchema = z.object({
  displayName: z.string().min(2, { message: 'profile.validation.displayNameRequired' }),
  phone: optionalUzPhone,
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const addressSchema = z.object({
  fullName: z.string().min(2, { message: 'addresses.validation.fullNameRequired' }),
  phone: z
    .string()
    .min(1, { message: 'addresses.validation.phoneRequired' })
    .regex(UZ_PHONE, { message: 'profile.validation.phoneInvalid' }),
  region: z.string().min(1, { message: 'addresses.validation.regionRequired' }),
  district: z.string().min(1, { message: 'addresses.validation.districtRequired' }),
  street: z.string().min(1, { message: 'addresses.validation.streetRequired' }),
  note: z.string().optional().or(z.literal('')),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
