import { z } from 'zod';
import { TimestampSchema } from './product';

/**
 * One product image stored in Firestore (`productImages/{id}`) while the
 * project has no Storage bucket (Spark). Products reference it as `kwimg:<id>`.
 */
export const ProductImageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  /** `data:image/jpeg;base64,…`, compressed on the device before the write. */
  dataUrl: z.string().startsWith('data:image/'),
  createdAt: TimestampSchema,
});

export type ProductImage = z.infer<typeof ProductImageSchema>;
