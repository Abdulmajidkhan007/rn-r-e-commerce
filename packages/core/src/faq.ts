import { z } from 'zod';
import { LocalizedTextSchema } from './localized';
import { TimestampSchema } from './product';

/**
 * One FAQ entry (`faqs/{id}`), public read, admin write. `answer` is plain
 * text — paragraphs separated by a blank line, same as blog bodies.
 */
export const FaqSchema = z.object({
  id: z.string(),
  question: LocalizedTextSchema,
  answer: LocalizedTextSchema,
  /** Ascending display order. */
  order: z.number().int().nonnegative(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Faq = z.infer<typeof FaqSchema>;
