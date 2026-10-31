import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
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
import { useTranslateKey } from '@/lib/useTranslateKey';
import { ImageUploadField } from '@/components/ImageUploadField';
import { compressProductImage } from '@/lib/image';
import { CsvTextField } from './CsvTextField';
import { VariantsTable } from './VariantsTable';

export interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** Provided when editing; omitted for create. */
  product?: Product;
}

const LOCALES = [
  { key: 'uz', label: 'admin.localeUz' },
  { key: 'en', label: 'admin.localeEn' },
  { key: 'ru', label: 'admin.localeRu' },
] as const;

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
    ...(product?.gender !== undefined ? { gender: product.gender } : {}),
    ...(product?.ageFromMonths !== undefined ? { ageFromMonths: product.ageFromMonths } : {}),
    ...(product?.ageToMonths !== undefined ? { ageToMonths: product.ageToMonths } : {}),
  };
}

export function ProductFormDialog({
  open,
  onClose,
  categories,
  product,
}: ProductFormDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // A new product's id is fixed up-front so image uploads can use its path.
  const [newId] = useState(() => newProductId());
  const productId = product?.id ?? newId;
  const isEdit = !!product;

  const defaults = useMemo(() => defaultsFor(product), [product]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults,
  });

  const sizes = watch('sizes');
  const colors = watch('colors');
  const variantsExcluded = watch('variantsExcluded');

  // Rebuild the size × colour matrix whenever an axis changes; rows that
  // survive keep the stock/price already typed into them.
  useEffect(() => {
    const excluded = pruneExcluded(sizes, colors, getValues('variantsExcluded'));
    setValue('variantsExcluded', excluded);
    setValue('variants', buildVariantMatrix(sizes, colors, getValues('variants'), excluded));
  }, [sizes, colors, getValues, setValue]);

  const removeVariant = (id: string): void => {
    const excluded = [...getValues('variantsExcluded'), id];
    setValue('variantsExcluded', excluded);
    setValue(
      'variants',
      getValues('variants').filter((v) => v.id !== id),
    );
  };

  const restoreVariants = (): void => {
    setValue('variantsExcluded', []);
    setValue('variants', buildVariantMatrix(sizes, colors, getValues('variants'), []));
  };

  const onSubmit = handleSubmit(async (values) => {
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
    reset(defaultsFor(undefined));
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? t('admin.editProduct') : t('admin.addProduct')}</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="product-form" onSubmit={onSubmit} spacing={2} sx={{ pt: 1 }}>
          <Typography variant="subtitle2">{t('admin.name')}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {LOCALES.map((loc) => (
              <TextField
                key={loc.key}
                label={t(loc.label)}
                size="small"
                {...register(`name.${loc.key}` as const)}
                error={loc.key === 'uz' && !!errors.name?.uz}
                helperText={
                  loc.key === 'uz' && errors.name?.uz ? tk('admin.validation.nameRequired') : ' '
                }
              />
            ))}
          </Stack>

          <Typography variant="subtitle2">{t('admin.description')}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {LOCALES.map((loc) => (
              <TextField
                key={loc.key}
                label={t(loc.label)}
                size="small"
                multiline
                {...register(`description.${loc.key}` as const)}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label={t('admin.price')}
              type="number"
              {...register('price', { valueAsNumber: true })}
              error={!!errors.price}
              helperText={errors.price ? tk(errors.price.message ?? '') : ' '}
            />
            <TextField
              label={t('admin.compareAtPrice')}
              type="number"
              {...register('compareAtPrice', {
                setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
              })}
              helperText=" "
            />
          </Stack>

          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <TextField
                select
                label={t('admin.category')}
                value={field.value}
                onChange={field.onChange}
                error={!!errors.categoryId}
                helperText={errors.categoryId ? tk(errors.categoryId.message ?? '') : ' '}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name.uz}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="sizes"
            render={({ field }) => (
              <CsvTextField
                label={t('admin.sizes')}
                value={field.value}
                onChange={field.onChange}
                helperText={t('admin.commaHint')}
              />
            )}
          />
          <Controller
            control={control}
            name="colors"
            render={({ field }) => (
              <CsvTextField
                label={t('admin.colors')}
                value={field.value}
                onChange={field.onChange}
                helperText={t('admin.commaHint')}
              />
            )}
          />

          <Stack direction="row" spacing={2}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  label={t('admin.gender')}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? undefined : e.target.value)
                  }
                >
                  <MenuItem value="">{t('admin.genderNone')}</MenuItem>
                  <MenuItem value="boys">{t('catalog.boys')}</MenuItem>
                  <MenuItem value="girls">{t('catalog.girls')}</MenuItem>
                  <MenuItem value="unisex">{t('catalog.unisex')}</MenuItem>
                </TextField>
              )}
            />
            {(['ageFromMonths', 'ageToMonths'] as const).map((name) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    type="number"
                    label={t(`admin.${name}`)}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                )}
              />
            ))}
          </Stack>

          {product && isLegacyProduct(product) && (
            <Alert severity="info">{t('admin.variantsLegacy', { count: product.stock })}</Alert>
          )}
          <Controller
            control={control}
            name="variants"
            render={({ field }) => (
              <VariantsTable
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

          <Typography variant="subtitle2">{t('admin.images')}</Typography>
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

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label={t('admin.active')}
              />
            )}
          />

          <Controller
            control={control}
            name="isDraft"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value ?? false} onChange={field.onChange} />}
                label={`${t('admin.catalog.draft')} — ${t('admin.catalog.draftHint')}`}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.cancel')}</Button>
        <Button type="submit" form="product-form" variant="contained" disabled={isSubmitting}>
          {t('admin.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
