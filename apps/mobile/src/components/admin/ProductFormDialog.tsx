import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  HelperText,
  Menu,
  Portal,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {
  buildVariantMatrix,
  initialFormVariants,
  isLegacyProduct,
  productFormSchema,
  pruneExcluded,
  totalVariantStock,
  type ProductFormValues,
} from '@kidswear/core';
import type { Category, Product } from '@kidswear/core';
import { useCreateProduct, useUpdateProduct } from '@kidswear/data';
import { newProductId, saveProductImage } from '@kidswear/firebase';
import { useTranslation } from '@kidswear/i18n';
import { FormTextInput } from '@/components/FormTextInput';
import { ImageUploadField } from '@/components/ImageUploadField';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { compressProductImage } from '@/lib/image';
import { CsvTextInput } from './CsvTextInput';
import { VariantsEditor } from './VariantsEditor';

export interface ProductFormDialogProps {
  visible: boolean;
  categories: Category[];
  /** Provided when editing; omitted for create. */
  product?: Product;
  onDismiss: () => void;
}

function defaultsFor(product: Product | undefined): ProductFormValues {
  return {
    name: { uz: product?.name.uz ?? '', en: product?.name.en ?? '', ru: product?.name.ru ?? '' },
    description: {
      uz: product?.description.uz ?? '',
      en: product?.description.en ?? '',
      ru: product?.description.ru ?? '',
    },
    price: product?.price ?? 0,
    ...(product?.compareAtPrice !== undefined ? { compareAtPrice: product.compareAtPrice } : {}),
    categoryId: product?.categoryId ?? '',
    sizes: product?.sizes ?? [],
    colors: product?.colors ?? [],
    stock: product?.stock ?? 0,
    variants: product ? initialFormVariants(product) : buildVariantMatrix([], []),
    variantsExcluded: product?.variantsExcluded ?? [],
    images: product?.images ?? [],
    isActive: product?.isActive ?? true,
    isDraft: product?.isDraft ?? false,
  };
}

export function ProductFormDialog({
  visible,
  categories,
  product,
  onDismiss,
}: ProductFormDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEdit = !!product;

  // A new product's id is fixed up-front so image uploads can use its path.
  const [newId] = useState(() => newProductId());
  const productId = product?.id ?? newId;
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultsFor(product),
  });

  useEffect(() => {
    if (visible) reset(defaultsFor(product));
  }, [visible, product, reset]);

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const sizes = useWatch({ control, name: 'sizes' });
  const colors = useWatch({ control, name: 'colors' });
  const variantsExcluded = useWatch({ control, name: 'variantsExcluded' });

  // Rebuild the size × colour matrix whenever an axis changes; rows that
  // survive keep the numbers already typed into them.
  useEffect(() => {
    const excluded = pruneExcluded(sizes, colors, getValues('variantsExcluded'));
    setValue('variantsExcluded', excluded);
    setValue('variants', buildVariantMatrix(sizes, colors, getValues('variants'), excluded));
  }, [sizes, colors, getValues, setValue]);

  const removeVariant = (id: string): void => {
    setValue('variantsExcluded', [...getValues('variantsExcluded'), id]);
    setValue(
      'variants',
      getValues('variants').filter((v) => v.id !== id),
    );
  };

  const restoreVariants = (): void => {
    setValue('variantsExcluded', []);
    setValue('variants', buildVariantMatrix(sizes, colors, getValues('variants'), []));
  };

  const submit = handleSubmit(async (values) => {
    // Product-level stock is the variants' sum (the mutation enforces it too).
    const payload = { ...values, stock: totalVariantStock(values.variants) };
    if (isEdit) {
      await updateProduct.mutateAsync({ id: productId, patch: payload });
    } else {
      await createProduct.mutateAsync({
        id: productId,
        input: { ...payload, rating: 0, reviewCount: 0 },
      });
    }
    onDismiss();
  });

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: '90%' }}>
        <Dialog.Title>{isEdit ? t('admin.editProduct') : t('admin.addProduct')}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 4 }}>
            <Text variant="labelLarge">{t('admin.name')}</Text>
            <FormTextInput
              control={control}
              name="name.uz"
              label={t('admin.localeUz')}
              error={errors.name?.uz ? tk('admin.validation.nameRequired') : undefined}
            />
            <FormTextInput control={control} name="name.en" label={t('admin.localeEn')} />
            <FormTextInput control={control} name="name.ru" label={t('admin.localeRu')} />

            <Text variant="labelLarge">{t('admin.description')}</Text>
            <FormTextInput control={control} name="description.uz" label={t('admin.localeUz')} />
            <FormTextInput control={control} name="description.en" label={t('admin.localeEn')} />
            <FormTextInput control={control} name="description.ru" label={t('admin.localeRu')} />

            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <TextInput
                  mode="outlined"
                  label={t('admin.price')}
                  keyboardType="number-pad"
                  value={String(field.value)}
                  onChangeText={(text) => field.onChange(Number(text) || 0)}
                  error={!!errors.price}
                />
              )}
            />
            <HelperText type="error" visible={!!errors.price}>
              {errors.price ? tk(errors.price.message ?? '') : ' '}
            </HelperText>

            <Controller
              control={control}
              name="compareAtPrice"
              render={({ field }) => (
                <TextInput
                  mode="outlined"
                  label={t('admin.compareAtPrice')}
                  keyboardType="number-pad"
                  value={field.value === undefined ? '' : String(field.value)}
                  onChangeText={(text) => field.onChange(text === '' ? undefined : Number(text))}
                />
              )}
            />

            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchor={
                <Button mode="outlined" icon="menu-down" onPress={() => setMenuOpen(true)}>
                  {selectedCategory ? selectedCategory.name.uz : t('admin.category')}
                </Button>
              }
            >
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <>
                    {categories.map((c) => (
                      <Menu.Item
                        key={c.id}
                        title={c.name.uz}
                        onPress={() => {
                          field.onChange(c.id);
                          setMenuOpen(false);
                        }}
                      />
                    ))}
                  </>
                )}
              />
            </Menu>
            <HelperText type="error" visible={!!errors.categoryId}>
              {errors.categoryId ? tk(errors.categoryId.message ?? '') : ' '}
            </HelperText>

            <Controller
              control={control}
              name="sizes"
              render={({ field }) => (
                <CsvTextInput
                  label={t('admin.sizes')}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <HelperText type="info" visible>
              {t('admin.commaHint')}
            </HelperText>
            <Controller
              control={control}
              name="colors"
              render={({ field }) => (
                <CsvTextInput
                  label={t('admin.colors')}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <HelperText type="info" visible>
              {t('admin.commaHint')}
            </HelperText>

            {product && isLegacyProduct(product) ? (
              <HelperText type="info" visible>
                {t('admin.variantsLegacy', { count: product.stock })}
              </HelperText>
            ) : null}
            <Controller
              control={control}
              name="variants"
              render={({ field }) => (
                <VariantsEditor
                  variants={field.value}
                  onChange={field.onChange}
                  onRemove={removeVariant}
                  excludedCount={variantsExcluded.length}
                  onRestore={restoreVariants}
                  rowError={(i) => {
                    const message = errors.variants?.[i]?.stock?.message;
                    return message ? tk(message) : undefined;
                  }}
                />
              )}
            />

            <Text variant="labelLarge" style={{ marginTop: 8 }}>
              {t('admin.images')}
            </Text>
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageUploadField
                  value={field.value}
                  onChange={field.onChange}
                  encode={compressProductImage}
                  upload={(image, index) => saveProductImage(productId, index, image)}
                />
              )}
            />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <Text variant="bodyMedium">{t('admin.active')}</Text>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch value={field.value} onValueChange={field.onChange} />
                )}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                {t('admin.catalog.draft')}
              </Text>
              <Controller
                control={control}
                name="isDraft"
                render={({ field }) => (
                  <Switch value={field.value ?? false} onValueChange={field.onChange} />
                )}
              />
            </View>
            <HelperText type="info" visible>
              {t('admin.catalog.draftHint')}
            </HelperText>
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
