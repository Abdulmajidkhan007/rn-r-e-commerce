import { z } from 'zod';

/** A piece of user-facing text in the platform's supported locales. uz is required. */
export const LocalizedTextSchema = z.object({
  uz: z.string(),
  en: z.string().optional(),
  ru: z.string().optional(),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
