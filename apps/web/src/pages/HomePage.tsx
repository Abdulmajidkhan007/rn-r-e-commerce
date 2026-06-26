import { Link as RouterLink } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { useCategories, useProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Skeleton } from '@/components';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';

export default function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { products, isLoading } = useProducts({ sort: 'newest' });
  const categoriesQuery = useCategories();

  const newest = products.slice(0, 8);

  return (
    <Stack spacing={5}>
      <Box
        sx={{
          borderRadius: 4,
          p: { xs: 4, md: 6 },
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: 'common.white',
        }}
      >
        <Stack spacing={2} sx={{ maxWidth: 560 }}>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            {t('appName')}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.95 }}>
            {t('catalog.newArrivals')}
          </Typography>
          <Button
            component={RouterLink}
            to="/catalog"
            variant="contained"
            color="inherit"
            sx={{ alignSelf: 'flex-start', color: 'primary.main', bgcolor: 'common.white' }}
          >
            {t('catalog.products')}
          </Button>
        </Stack>
      </Box>

      {(categoriesQuery.data ?? []).length > 0 && (
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('catalog.category')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {(categoriesQuery.data ?? []).map((category) => (
              <Chip
                key={category.id}
                component={RouterLink}
                to="/catalog"
                clickable
                label={localized(category.name)}
              />
            ))}
          </Stack>
        </Stack>
      )}

      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('catalog.newArrivals')}
        </Typography>
        <Grid container spacing={2}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Skeleton variant="rectangular" sx={{ aspectRatio: '3 / 4', borderRadius: 2 }} />
                  <Skeleton sx={{ mt: 1 }} width="80%" />
                </Grid>
              ))
            : newest.map((product) => (
                <Grid key={product.id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <ProductCard product={product} />
                </Grid>
              ))}
        </Grid>
      </Stack>
    </Stack>
  );
}
