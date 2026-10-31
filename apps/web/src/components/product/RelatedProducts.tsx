import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Product } from '@kidswear/core';
import { useSimilarProducts } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { tokens } from '@kidswear/theme';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductCardSkeleton } from '@/components/catalog/ProductCardSkeleton';

export interface RelatedProductsProps {
  product: Product;
}

/** "O'xshashlar": horizontal, snap-scrolling row of the products most like this one. */
export function RelatedProducts({ product }: RelatedProductsProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { products: related, isLoading } = useSimilarProducts(product);

  if (!isLoading && related.length === 0) return null;

  return (
    <Box component="section" sx={{ pt: `${tokens.spacing['3xl']}px` }}>
      <Typography variant="h2" sx={{ mb: `${tokens.spacing.lg}px` }}>
        {t('catalog.similar')}
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
