import { z } from 'zod';
import { LocalizedTextSchema } from './localized';
import { TimestampSchema } from './product';

/**
 * A blog post. `body` is plain text: paragraphs separated by a blank line.
 * No HTML is stored or rendered, so an admin typo cannot inject markup.
 */
export const BlogPostSchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: LocalizedTextSchema,
  excerpt: LocalizedTextSchema,
  body: LocalizedTextSchema,
  coverImage: z.string().url().optional(),
  published: z.boolean(),
  /** Epoch millis; set when first published. Drives ordering on the site. */
  publishedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type BlogPost = z.infer<typeof BlogPostSchema>;

/** Splits a body into paragraphs: blank-line separated, trimmed, empties dropped. */
export function blogParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
