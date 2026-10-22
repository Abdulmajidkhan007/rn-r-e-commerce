import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useProduct } from '@kidswear/data';
import { useAppDispatch, addItem } from '@kidswear/store';
import { describeVariantPicker } from '@kidswear/core';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { PriceTag, QuantityStepper, Rating, Skeleton } from '@/components';
import { StockBadge } from '@/components/catalog/StockBadge';
import { ProductGallery } from '@/components/product/ProductGallery';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ProductReviews } from '@/components/reviews/ProductReviews';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { FavoriteButton } from '@/components/catalog/FavoriteButton';

export default function ProductPage(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const dispatch = useAppDispatch();
  const { id = '' } = useParams();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  useDocumentTitle(product ? localized(product.name) : t('nav.catalog'));

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: `${tokens.spacing['5xl']}px`,
          }}
        >
          <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 5', borderRadius: 3 }} />
          <Stack spacing={2}>
            <Skeleton width="60%" height={48} />
            <Skeleton width="30%" height={32} />
            <Skeleton width="90%" sx={{ mt: 2 }} />
            <Skeleton width="70%" />
          </Stack>
        </Box>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              {t('catalog.retry')}
            </Button>
          }
        >
          {t('catalog.loadError')}
        </Alert>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 8, textAlign: 'center' }}>
        <Typography variant="h2">404</Typography>
        <Typography color="text.secondary">{t('catalog.noProducts')}</Typography>
      </Box>
    );
  }

  const picker = describeVariantPicker(product, size, color);
  const { needsSize, needsColor, variant } = picker;
  const picked = (!needsSize || size !== null) && (!needsColor || color !== null);

  const handleAdd = (): void => {
    if (!variant) return;
    dispatch(
      addItem({
        productId: product.id,
        variantId: variant.id,
        name: localized(product.name),
        image: product.images[0] ?? '',
        price: picker.price,
        quantity: Math.min(qty, picker.available),
        size: size ?? '',
        color: color ?? '',
      }),
    );
    setAdded(true);
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: `${tokens.spacing['5xl']}px`,
        }}
      >
        <ProductGallery images={product.images} alt={localized(product.name)} />

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: tokens.fontSizes['4xl'], md: tokens.fontSizes['5xl'] } }}
            >
              {localized(product.name)}
            </Typography>
            <StockBadge stock={product.stock} />
            <FavoriteButton productId={product.id} size="medium" />
          </Stack>

          {product.reviewCount > 0 && (
            <Stack
              component="a"
              href="#reviews"
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', color: 'text.secondary', textDecoration: 'none' }}
            >
              <Rating
                value={product.rating}
                size="small"
                aria-label={t('reviews.ratingAria', { value: product.rating })}
              />
              <Typography variant="body2">
                {product.rating.toFixed(1)} · {t('reviews.count', { count: product.reviewCount })}
              </Typography>
            </Stack>
          )}

          <PriceTag
            price={picker.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            format={picker.priceIsFrom ? (price) => t('catalog.priceFrom', { price }) : undefined}
          />

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.7, maxWidth: '64ch' }}
          >
            {localized(product.description)}
          </Typography>

          {needsSize && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('catalog.selectSize')}</Typography>
              <ToggleButtonGroup
                value={size}
                exclusive
                onChange={(_, next: string | null) => setSize(next)}
                aria-label={t('catalog.selectSize')}
                sx={{ flexWrap: 'wrap', gap: 1 }}
              >
                {picker.sizes.map(({ value: s, disabled }) => (
                  <ToggleButton
                    key={s}
                    value={s}
                    disabled={disabled}
                    sx={{
                      borderRadius: `${tokens.radii.full}px`,
                      border: '1px solid',
                      borderColor: 'divider',
                      px: 2,
                      '&.Mui-disabled': { textDecoration: 'line-through' },
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                      },
                    }}
                  >
                    {s}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          )}

          {needsColor && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('catalog.selectColor')}</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {picker.colors.map(({ value: c, disabled }) => (
                  <Chip
                    key={c}
                    label={c}
                    disabled={disabled}
                    aria-pressed={color === c}
                    variant={color === c ? 'filled' : 'outlined'}
                    color={color === c ? 'primary' : 'default'}
                    onClick={() => setColor(color === c ? null : c)}
                    sx={{ '&.Mui-disabled': { textDecoration: 'line-through' } }}
                  />
                ))}
              </Stack>
            </Stack>
          )}

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2">{t('catalog.quantity')}</Typography>
            <QuantityStepper
              value={qty}
              onChange={setQty}
              min={1}
              max={Math.max(1, variant ? picker.available : product.stock)}
            />
          </Stack>

          {picked && variant && (
            <Typography variant="body2" color={picker.canAdd ? 'text.secondary' : 'error'}>
              {picker.canAdd
                ? t('catalog.variantInStock', { count: picker.available })
                : t('catalog.variantUnavailable')}
            </Typography>
          )}

          <Button variant="contained" size="large" disabled={!picker.canAdd} onClick={handleAdd}>
            {picked ? t('catalog.addToCart') : t('catalog.chooseVariant')}
          </Button>
        </Stack>
      </Box>

      <ProductReviews product={product} />

      <RelatedProducts categoryId={product.categoryId} exclude={product.id} />

      <Snackbar
        open={added}
        autoHideDuration={2500}
        onClose={() => setAdded(false)}
        message={t('catalog.addedToCart')}
      />
    </Box>
  );
}
