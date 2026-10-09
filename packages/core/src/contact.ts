import { z } from 'zod';
import { TimestampSchema } from './product';

/** Limits are mirrored in firestore.rules — the rules are what actually enforce them. */
export const CONTACT_LIMITS = {
  name: 80,
  phone: 30,
  email: 120,
  messageMin: 5,
  message: 2000,
} as const;

export const ContactStatusSchema = z.enum(['new', 'read']);
export type ContactStatus = z.infer<typeof ContactStatusSchema>;

/** A message sent through the public contact form. Anyone may create one; only admins read. */
export const ContactMessageSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(CONTACT_LIMITS.name),
  phone: z.string().min(1).max(CONTACT_LIMITS.phone),
  email: z.string().max(CONTACT_LIMITS.email).optional(),
  message: z.string().min(CONTACT_LIMITS.messageMin).max(CONTACT_LIMITS.message),
  status: ContactStatusSchema,
  /** Set when the sender was signed in. */
  userId: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type ContactMessage = z.infer<typeof ContactMessageSchema>;

/** Form values (validated client-side; rules re-check sizes server-side). */
export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'contact.errors.name').max(CONTACT_LIMITS.name),
  phone: z
    .string()
    .trim()
    .min(7, 'contact.errors.phone')
    .max(CONTACT_LIMITS.phone)
    .regex(/^[+\d\s()-]+$/, 'contact.errors.phone'),
  email: z
    .string()
    .trim()
    .max(CONTACT_LIMITS.email)
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'contact.errors.email'),
  message: z
    .string()
    .trim()
    .min(CONTACT_LIMITS.messageMin, 'contact.errors.message')
    .max(CONTACT_LIMITS.message),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;
