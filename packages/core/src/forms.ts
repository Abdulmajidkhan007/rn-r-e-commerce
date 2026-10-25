import { z } from 'zod';
import { LocalizedTextSchema } from './localized';
import { ProductVariantSchema } from './variant';

/**
 * Admin form schemas. Validation messages are i18n keys (under
 * `admin.validation.*`) resolved by the UI. `rating`/`reviewCount` are
 * system-managed (default 0 on create) and are NOT part of the product form.
 */
export const productFormSchema = z.object({
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  price: z.number().int().positive({ message: 'admin.validation.priceMin' }),
  compareAtPrice: z.number().int().positive().optional(),
  categoryId: z.string().min(1, { message: 'admin.validation.categoryRequired' }),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  /** Derived from `variants` on save (their sum); kept for legacy edits. */
  stock: z.number().int().nonnegative({ message: 'admin.validation.stockMin' }),
  variants: z.array(
    ProductVariantSchema.extend({
      stock: z.number().int().nonnegative({ message: 'admin.validation.stockMin' }),
      price: z.number().int().positive({ message: 'admin.validation.priceMin' }).optional(),
    }),
  ),
  variantsExcluded: z.array(z.string()),
  images: z.array(z.string()),
  isActive: z.boolean(),
  /** Draft products stay hidden from the storefront. Optional: older forms omit it. */
  isDraft: z.boolean().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  name: LocalizedTextSchema,
  slug: z.string().min(1, { message: 'admin.validation.slugRequired' }),
  order: z.number().int(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
