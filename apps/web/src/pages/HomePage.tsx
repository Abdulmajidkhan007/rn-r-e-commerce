import { Link as RouterLink } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { Product } from '@kidswear/core';
import { useCategories, useProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Skeleton } from '@/components';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useLocalized } from '@/lib/useLocalized';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { pickDeals } from '@/lib/deals';

const NEWEST_COUNT = 8;
const DEALS_COUNT = 4;

function SectionHeader({ title, to }: { title: string; to?: string }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {to && (
        <Button component={RouterLink} to={to} size="small" endIcon={<ArrowForwardIcon />}>
          {t('landing.seeAll')}
        </Button>
      )}
    </Stack>
  );
}

function ProductGrid({
  products,
  isLoading,
  placeholders,
}: {
  products: readonly Product[];
  isLoading: boolean;
  placeholders: number;
}): React.ReactElement {
  return (
    <Grid container spacing={2}>
      {isLoading
        ? Array.from({ length: placeholders }).map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
              <Skeleton variant="rectangular" sx={{ aspectRatio: '3 / 4', borderRadius: 2 }} />
              <Skeleton sx={{ mt: 1 }} width="80%" />
            </Grid>
          ))
        : products.map((product) => (
            <Grid key={product.id} size={{ xs: 6, sm: 4, md: 3 }}>
              <ProductCard product={product} />
            </Grid>
          ))}
    </Grid>
  );
}

export default function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  useDocumentTitle(t('nav.home'));
  const localized = useLocalized();
  const { products, isLoading } = useProducts({ sort: 'newest' });
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  const newest = products.slice(0, NEWEST_COUNT);
  const deals = pickDeals(products, DEALS_COUNT);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={{ xs: 4, md: 6 }}>
        <Box
          sx={{
            borderRadius: 4,
            p: { xs: 3, sm: 4, md: 7 },
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'common.white',
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 620 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, fontSize: { xs: '1.9rem', md: '3rem' }, lineHeight: 1.15 }}
            >
              {t('landing.heroTitle')}
            </Typography>
            <Typography sx={{ opacity: 0.95, fontSize: { xs: '1rem', md: '1.15rem' } }}>
              {t('landing.heroSubtitle')}
            </Typography>
            <Button
              component={RouterLink}
              to="/catalog"
              variant="contained"
              color="inherit"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ alignSelf: 'flex-start', color: 'primary.main', bgcolor: 'common.white' }}
            >
              {t('landing.shopNow')}
            </Button>
          </Stack>
        </Box>

        {categories.length > 0 && (
          <Stack spacing={2}>
            <SectionHeader title={t('catalog.category')} />
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                component={RouterLink}
                to="/catalog"
                clickable
                color="primary"
                variant="outlined"
                label={t('landing.allCategories')}
              />
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  component={RouterLink}
                  to={`/catalog?category=${encodeURIComponent(category.id)}`}
                  clickable
                  label={localized(category.name)}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {(isLoading || deals.length > 0) && (
          <Stack spacing={2}>
            <SectionHeader title={t('landing.deals')} to="/catalog" />
            <ProductGrid products={deals} isLoading={isLoading} placeholders={DEALS_COUNT} />
          </Stack>
        )}

        <Stack spacing={2}>
          <SectionHeader title={t('catalog.newArrivals')} to="/catalog" />
          <ProductGrid products={newest} isLoading={isLoading} placeholders={NEWEST_COUNT / 2} />
        </Stack>
      </Stack>
    </Container>
  );
}
