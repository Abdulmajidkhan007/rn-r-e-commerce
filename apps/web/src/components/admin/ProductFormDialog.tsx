import { useMemo, useState } from 'react';
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
import { productFormSchema, type ProductFormValues } from '@kidswear/core';
import type { Category, Product } from '@kidswear/core';
import { useCreateProduct, useUpdateProduct } from '@kidswear/data';
import { newProductId, uploadProductImage } from '@kidswear/firebase';
import { useTranslation } from '@kidswear/i18n';
import { useTranslateKey } from '@/lib/useTranslateKey';
import { ImageUploadField } from '@/components/ImageUploadField';

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

function toCsv(values: string[]): string {
  return values.join(', ');
}
function fromCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
    images: product?.images ?? [],
    isActive: product?.isActive ?? true,
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
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults,
  });

  const onSubmit = handleSubmit(async (values) => {
    if (isEdit) {
      await updateProduct.mutateAsync({ id: productId, patch: values });
    } else {
      await createProduct.mutateAsync({
        id: productId,
        input: { ...values, rating: 0, reviewCount: 0 },
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
            <TextField
              label={t('admin.stock')}
              type="number"
              {...register('stock', { valueAsNumber: true })}
              error={!!errors.stock}
              helperText={errors.stock ? tk(errors.stock.message ?? '') : ' '}
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
              <TextField
                label={t('admin.sizes')}
                value={toCsv(field.value)}
                onChange={(e) => field.onChange(fromCsv(e.target.value))}
                helperText={t('admin.commaHint')}
              />
            )}
          />
          <Controller
            control={control}
            name="colors"
            render={({ field }) => (
              <TextField
                label={t('admin.colors')}
                value={toCsv(field.value)}
                onChange={(e) => field.onChange(fromCsv(e.target.value))}
                helperText={t('admin.commaHint')}
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
                upload={(blob, index) => uploadProductImage(productId, index, blob)}
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
