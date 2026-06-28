import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useProduct } from '@kidswear/data';
import { useAppDispatch, addItem } from '@kidswear/store';
import { stockStatus } from '@kidswear/utils';
import { useTranslation } from '@kidswear/i18n';
import { PriceTag, Rating, QuantityStepper, Skeleton } from '@/components';
import { StockBadge } from '@/components/catalog/StockBadge';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ProductPage(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const dispatch = useAppDispatch();
  const { id = '' } = useParams();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  useDocumentTitle(product ? localized(product.name) : t('nav.catalog'));

  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="rectangular" sx={{ aspectRatio: '3 / 4', borderRadius: 2 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton width="60%" height={40} />
          <Skeleton width="30%" />
          <Skeleton width="90%" sx={{ mt: 2 }} />
        </Grid>
      </Grid>
    );
  }

  if (isError) {
    return (
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
    );
  }

  if (!product) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h5">404</Typography>
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
    <>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            component="img"
            src={product.images[activeImage]}
            alt={localized(product.name)}
            sx={{
              width: '100%',
              aspectRatio: '3 / 4',
              objectFit: 'cover',
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          />
          {product.images.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {product.images.map((img, i) => (
                <Box
                  key={img}
                  component="img"
                  src={img}
                  alt=""
                  onClick={() => setActiveImage(i)}
                  sx={{
                    width: 64,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: 2,
                    borderColor: i === activeImage ? 'primary.main' : 'transparent',
                  }}
                />
              ))}
            </Stack>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {localized(product.name)}
              </Typography>
              <StockBadge stock={product.stock} />
            </Stack>

            <Rating value={product.rating} />
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />

            <Typography color="text.secondary">{localized(product.description)}</Typography>

            {needsSize && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">{t('catalog.selectSize')}</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {product.sizes.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      color={size === s ? 'primary' : 'default'}
                      onClick={() => setSize(s)}
                    />
                  ))}
                </Stack>
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
        </Grid>
      </Grid>

      <Snackbar
        open={added}
        autoHideDuration={2500}
        onClose={() => setAdded(false)}
        message={t('catalog.addedToCart')}
      />
    </>
  );
}
