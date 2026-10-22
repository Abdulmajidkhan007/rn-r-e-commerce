import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Product } from '@kidswear/core';
import { useProductReviews } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Rating, Skeleton } from '@/components';
import { ReviewCard } from './ReviewCard';

export interface ProductReviewsProps {
  product: Pick<Product, 'id' | 'rating' | 'reviewCount'>;
}

/**
 * Product page reviews. The summary line is the product's stored
 * `rating`/`reviewCount` (recounted on admin moderation) — the same number the
 * catalog shows — never an average of the loaded page.
 */
export function ProductReviews({ product }: ProductReviewsProps): React.ReactElement {
  const { t } = useTranslation();
  const { reviews, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useProductReviews(product.id);

  return (
    <Stack component="section" spacing={2} sx={{ mt: { xs: 5, md: 8 } }} aria-labelledby="reviews">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography id="reviews" variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {t('reviews.title')}
        </Typography>
        {product.reviewCount > 0 && (
          <>
            <Rating
              value={product.rating}
              aria-label={t('reviews.ratingAria', { value: product.rating })}
            />
            <Typography variant="body2" color="text.secondary">
              {product.rating.toFixed(1)} · {t('reviews.count', { count: product.reviewCount })}
            </Typography>
          </>
        )}
      </Stack>

      {isLoading ? (
        <Stack spacing={1.5}>
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : isError ? (
        <Alert severity="error">{t('reviews.loadError')}</Alert>
      ) : reviews.length === 0 ? (
        <Typography color="text.secondary">{t('reviews.noReviews')}</Typography>
      ) : (
        <Stack spacing={1.5} sx={{ maxWidth: 760 }}>
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
          {hasNextPage && (
            <Button
              variant="outlined"
              disabled={isFetchingNextPage}
              onClick={fetchNextPage}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('reviews.showMore')}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
