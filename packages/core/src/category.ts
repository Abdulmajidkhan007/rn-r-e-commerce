import { z } from 'zod';
import { LocalizedTextSchema } from './localized';

export const CategorySchema = z.object({
  id: z.string(),
  name: LocalizedTextSchema,
  slug: z.string(),
  parentId: z.string().nullable().optional(),
  order: z.number().int(),
  imageUrl: z.string().url().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
