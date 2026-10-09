import { Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useProductsByIds } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Skeleton } from '@/components';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useFavoritesContext } from '@/app/FavoritesProvider';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function FavoritesPage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('favorites.title'));
  const { ordered, isLoading } = useFavoritesContext();

  const { products, isLoading: productsLoading } = useProductsByIds(ordered);
  const loading = isLoading || productsLoading;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800 }}>
          {t('favorites.title')}
        </Typography>
        {loading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                <Skeleton variant="rectangular" sx={{ aspectRatio: '3 / 4', borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : products.length === 0 ? (
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography color="text.secondary">{t('favorites.empty')}</Typography>
            <Button component={RouterLink} to="/catalog" variant="contained">
              {t('landing.shopNow')}
            </Button>
          </Stack>
        ) : (
          <Grid container spacing={2}>
            {products.map((product) => (
              <Grid key={product.id} size={{ xs: 6, sm: 4, md: 3 }}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
