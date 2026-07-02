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
import { stockStatus } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { PriceTag, QuantityStepper, Skeleton } from '@/components';
import { StockBadge } from '@/components/catalog/StockBadge';
import { ProductGallery } from '@/components/product/ProductGallery';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

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

  const status = stockStatus(product.stock);
  const needsSize = product.sizes.length > 0;
  const needsColor = product.colors.length > 0;
  const canAdd =
    status !== 'out' && (!needsSize || size !== null) && (!needsColor || color !== null);

  const handleAdd = (): void => {
    dispatch(
      addItem({
        productId: product.id,
        name: localized(product.name),
        image: product.images[0] ?? '',
        price: product.price,
        quantity: qty,
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
            <Typography variant="h1" sx={{ fontSize: { xs: tokens.fontSizes['4xl'], md: tokens.fontSizes['5xl'] } }}>
              {localized(product.name)}
            </Typography>
            <StockBadge stock={product.stock} />
          </Stack>

          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />

          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: '64ch' }}>
            {localized(product.description)}
          </Typography>

          {needsSize && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t('catalog.selectSize')}</Typography>
              <ToggleButtonGroup
                value={size}
                exclusive
                onChange={(_, next: string | null) => setSize(next)}
                sx={{ flexWrap: 'wrap', gap: 1 }}
              >
                {product.sizes.map((s) => (
                  <ToggleButton
                    key={s}
                    value={s}
                    sx={{
                      borderRadius: `${tokens.radii.full}px`,
                      border: '1px solid',
                      borderColor: 'divider',
                      px: 2,
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
                {product.colors.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    variant={color === c ? 'filled' : 'outlined'}
                    color={color === c ? 'primary' : 'default'}
                    onClick={() => setColor(c)}
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
              max={Math.max(1, product.stock)}
            />
          </Stack>

          <Button variant="contained" size="large" disabled={!canAdd} onClick={handleAdd}>
            {t('catalog.addToCart')}
          </Button>
        </Stack>
      </Box>

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
