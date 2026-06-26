import { z } from 'zod';

export const AddressSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  region: z.string(),
  district: z.string(),
  street: z.string(),
  note: z.string().optional(),
});

export type Address = z.infer<typeof AddressSchema>;
