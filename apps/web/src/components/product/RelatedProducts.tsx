import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductCardSkeleton } from '@/components/catalog/ProductCardSkeleton';

export interface RelatedProductsProps {
  categoryId: string;
  exclude: string;
}

/** Horizontal, snap-scrolling row of other products in the same category. */
export function RelatedProducts({ categoryId, exclude }: RelatedProductsProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { products, isLoading } = useProducts({ categoryId });
  const related = products.filter((p) => p.id !== exclude);

  if (!isLoading && related.length === 0) return null;

  return (
    <Box component="section" sx={{ pt: `${tokens.spacing['3xl']}px` }}>
      <Typography variant="h2" sx={{ mb: `${tokens.spacing.lg}px` }}>
        {t('catalog.featured')}
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          pb: 1,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  flex: '0 0 auto',
                  width: { xs: '60%', sm: '32%', md: '24%' },
                  scrollSnapAlign: 'start',
                }}
              >
                <ProductCardSkeleton />
              </Box>
            ))
          : related.map((product) => (
              <Box
                key={product.id}
                sx={{
                  flex: '0 0 auto',
                  width: { xs: '60%', sm: '32%', md: '24%' },
                  scrollSnapAlign: 'start',
                }}
              >
                <ProductCard product={product} />
              </Box>
            ))}
      </Stack>
    </Box>
  );
}
