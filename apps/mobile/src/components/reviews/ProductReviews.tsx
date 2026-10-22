import { View } from 'react-native';
import { Button, HelperText, Text, useTheme } from 'react-native-paper';
import type { Product } from '@kidswear/core';
import { useProductReviews } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { Rating } from '@/components/Rating';
import { Skeleton } from '@/components/Skeleton';
import { ReviewCard } from './ReviewCard';

export interface ProductReviewsProps {
  product: Pick<Product, 'id' | 'rating' | 'reviewCount'>;
}

/**
 * Product screen reviews. The summary is the product's stored
 * `rating`/`reviewCount` (recounted on admin moderation), not an average of
 * the loaded page.
 */
export function ProductReviews({ product }: ProductReviewsProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const { reviews, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useProductReviews(product.id);

  return (
    <View style={{ gap: 12, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Text variant="titleMedium">{t('reviews.title')}</Text>
        {product.reviewCount > 0 ? (
          <>
            <Rating value={product.rating} size={16} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {product.rating.toFixed(1)} · {t('reviews.count', { count: product.reviewCount })}
            </Text>
          </>
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ gap: 8 }}>
          <Skeleton height={88} />
          <Skeleton height={88} />
        </View>
      ) : isError ? (
        <HelperText type="error" visible>
          {t('reviews.loadError')}
        </HelperText>
      ) : reviews.length === 0 ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('reviews.noReviews')}
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
          {hasNextPage ? (
            <Button
              mode="outlined"
              onPress={fetchNextPage}
              loading={isFetchingNextPage}
              disabled={isFetchingNextPage}
            >
              {t('reviews.showMore')}
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}
