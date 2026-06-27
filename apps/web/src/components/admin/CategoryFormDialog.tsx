import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { categoryFormSchema, type CategoryFormValues } from '@kidswear/core';
import type { Category } from '@kidswear/core';
import { useCreateCategory, useUpdateCategory } from '@kidswear/data';
import { newCategoryId, type CategoryInput } from '@kidswear/firebase';
import { useTranslation } from '@kidswear/i18n';
import { slugify } from '@kidswear/utils';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Provided when editing; omitted for create. */
  category?: Category;
}

const LOCALES = [
  { key: 'uz', label: 'admin.localeUz' },
  { key: 'en', label: 'admin.localeEn' },
  { key: 'ru', label: 'admin.localeRu' },
] as const;

function defaultsFor(category: Category | undefined): CategoryFormValues {
  return {
    name: {
      uz: category?.name.uz ?? '',
      en: category?.name.en ?? '',
      ru: category?.name.ru ?? '',
    },
    slug: category?.slug ?? '',
    order: category?.order ?? 0,
    imageUrl: category?.imageUrl ?? '',
  };
}

/** Drops the empty imageUrl so it never fails the stored URL schema on read. */
function toInput(values: CategoryFormValues): CategoryInput {
  const { imageUrl, ...rest } = values;
  return imageUrl ? { ...rest, imageUrl } : rest;
}

export function CategoryFormDialog({
  open,
  onClose,
  category,
}: CategoryFormDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEdit = !!category;

  const defaults = useMemo(() => defaultsFor(category), [category]);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    const input = toInput(values);
    if (isEdit && category) {
      await updateCategory.mutateAsync({ id: category.id, patch: input });
    } else {
      await createCategory.mutateAsync({ id: newCategoryId(), input });
    }
    reset(defaultsFor(undefined));
    onClose();
  });

  // Suggest a slug from the uz name only when the slug field is still empty.
  const suggestSlug = (): void => {
    if (!getValues('slug')) setValue('slug', slugify(getValues('name.uz')));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? t('admin.editCategory') : t('admin.addCategory')}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="category-form" onSubmit={onSubmit} spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {LOCALES.map((loc) => (
              <TextField
                key={loc.key}
                label={`${t('admin.name')} (${t(loc.label)})`}
                size="small"
                {...register(`name.${loc.key}` as const, {
                  onBlur: loc.key === 'uz' ? suggestSlug : undefined,
                })}
                error={loc.key === 'uz' && !!errors.name?.uz}
              />
            ))}
          </Stack>

          <TextField
            label={t('admin.slug')}
            {...register('slug')}
            error={!!errors.slug}
            helperText={errors.slug ? tk(errors.slug.message ?? '') : ' '}
          />

          <Controller
            control={control}
            name="order"
            render={({ field }) => (
              <TextField
                label={t('admin.order')}
                type="number"
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />

          <TextField
            label={t('admin.imageUrl')}
            placeholder="https://…"
            {...register('imageUrl')}
            error={!!errors.imageUrl}
            helperText=" "
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel')}</Button>
        <Button type="submit" form="category-form" variant="contained" disabled={isSubmitting}>
          {t('admin.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
