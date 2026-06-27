import { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { categoryFormSchema, type CategoryFormValues } from '@kidswear/core';
import type { Category } from '@kidswear/core';
import { useCreateCategory, useUpdateCategory } from '@kidswear/data';
import { newCategoryId, type CategoryInput } from '@kidswear/firebase';
import { slugify } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { useTranslateKey } from '@/lib/useTranslateKey';

export interface CategoryFormDialogProps {
  visible: boolean;
  /** Provided when editing; omitted for create. */
  category?: Category;
  onDismiss: () => void;
}

function defaultsFor(category: Category | undefined): CategoryFormValues {
  return {
    name: { uz: category?.name.uz ?? '', en: category?.name.en ?? '', ru: category?.name.ru ?? '' },
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
  visible,
  category,
  onDismiss,
}: CategoryFormDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEdit = !!category;

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultsFor(category),
  });

  useEffect(() => {
    if (visible) reset(defaultsFor(category));
  }, [visible, category, reset]);

  const suggestSlug = (): void => {
    if (!getValues('slug')) setValue('slug', slugify(getValues('name.uz')));
  };

  const submit = handleSubmit(async (values) => {
    const input = toInput(values);
    if (isEdit && category) {
      await updateCategory.mutateAsync({ id: category.id, patch: input });
    } else {
      await createCategory.mutateAsync({ id: newCategoryId(), input });
    }
    onDismiss();
  });

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: '90%' }}>
        <Dialog.Title>{isEdit ? t('admin.editCategory') : t('admin.addCategory')}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
            <Controller
              control={control}
              name="name.uz"
              render={({ field }) => (
                <TextInput
                  mode="outlined"
                  label={`${t('admin.name')} (${t('admin.localeUz')})`}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={suggestSlug}
                  error={!!errors.name?.uz}
                  style={{ marginBottom: 8 }}
                />
              )}
            />
            <FormTextInput
              control={control}
              name="name.en"
              label={`${t('admin.name')} (${t('admin.localeEn')})`}
            />
            <FormTextInput
              control={control}
              name="name.ru"
              label={`${t('admin.name')} (${t('admin.localeRu')})`}
            />
            <FormTextInput
              control={control}
              name="slug"
              label={t('admin.slug')}
              error={errors.slug ? tk(errors.slug.message ?? '') : undefined}
            />
            <Controller
              control={control}
              name="order"
              render={({ field }) => (
                <TextInput
                  mode="outlined"
                  label={t('admin.order')}
                  keyboardType="number-pad"
                  value={String(field.value)}
                  onChangeText={(text) => field.onChange(Number(text) || 0)}
                  style={{ marginBottom: 8 }}
                />
              )}
            />
            <FormTextInput control={control} name="imageUrl" label={t('admin.imageUrl')} />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('admin.cancel')}</Button>
          <Button mode="contained" onPress={submit} loading={isSubmitting} disabled={isSubmitting}>
            {t('admin.save')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
