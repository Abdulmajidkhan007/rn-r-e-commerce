import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  HelperText,
  SegmentedButtons,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_REVIEWS_LIMIT, type Review, type ReviewStatus } from '@kidswear/core';
import {
  reviewErrorKey,
  useAdminProducts,
  useAdminReviews,
  useModerateReview,
  useRecomputeRatings,
} from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { useAppSelector } from '@kidswear/store';
import { formatDate } from '@kidswear/utils';
import { Rating } from '@/components/Rating';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useLocalized } from '@/lib/useLocalized';
import { useTranslateKey } from '@/lib/useTranslateKey';

type Filter = ReviewStatus | 'all';

export function AdminReviewsScreen(): React.ReactElement {
  const { t } = useTranslation();
  const tk = useTranslateKey();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const localized = useLocalized();
  const language = useAppSelector((s) => s.ui.language);
  const [filter, setFilter] = useState<Filter>('all');
  const { data: reviews = [], isLoading, refetch, isRefetching } = useAdminReviews(filter);
  const { data: products = [] } = useAdminProducts();
  const moderate = useModerateReview();
  const recompute = useRecomputeRatings();
  const [deleting, setDeleting] = useState<Review | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const error = moderate.error ?? recompute.error;

  const productNames = useMemo(
    () => new Map(products.map((p) => [p.id, localized(p.name)] as const)),
    [products, localized],
  );

  const header = (
    <View style={{ gap: 8 }}>
      <Button
        mode="outlined"
        icon="sync"
        loading={recompute.isPending}
        disabled={recompute.isPending}
        onPress={() =>
          recompute.mutate(undefined, {
            onSuccess: (count) => setNotice(t('reviews.admin.recomputed', { count })),
          })
        }
      >
        {t('reviews.admin.recompute')}
      </Button>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('reviews.admin.ratingHint')}
      </Text>
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as Filter)}
        buttons={[
          { value: 'all', label: t('reviews.admin.all') },
          { value: 'visible', label: t('reviews.admin.visible') },
          { value: 'hidden', label: t('reviews.admin.hidden') },
        ]}
      />
      {error ? (
        <HelperText type="error" visible>
          {tk(reviewErrorKey(error))}
        </HelperText>
      ) : null}
    </View>
  );

  return (
    <>
      <FlatList
        data={isLoading ? [] : reviews}
        keyExtractor={(r) => r.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} />
          ) : (
            <Text style={{ textAlign: 'center', opacity: 0.7, marginTop: 32 }}>
              {t('reviews.admin.noReviews')}
            </Text>
          )
        }
        ListFooterComponent={
          reviews.length >= ADMIN_REVIEWS_LIMIT ? (
            <Text variant="labelSmall" style={{ opacity: 0.6 }}>
              {t('reviews.admin.limitNote', { count: ADMIN_REVIEWS_LIMIT })}
            </Text>
          ) : null
        }
        renderItem={({ item: r }) => (
          <Card mode="outlined" style={{ opacity: r.status === 'hidden' ? 0.75 : 1 }}>
            <Card.Content style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Rating value={r.rating} size={16} />
                <Text variant="titleSmall" style={{ flex: 1 }} numberOfLines={1}>
                  {r.authorName}
                </Text>
                <Text variant="labelSmall" style={{ opacity: 0.6 }}>
                  {formatDate(r.createdAt, language)}
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('reviews.admin.product')}: {productNames.get(r.productId) ?? r.productId} ·{' '}
                {t('reviews.admin.order')} #{r.orderId.slice(0, 8)}
              </Text>
              {r.status === 'hidden' || r.featured ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {r.status === 'hidden' ? (
                    <Chip compact icon="eye-off-outline">
                      {t('reviews.admin.hidden')}
                    </Chip>
                  ) : null}
                  {r.featured ? (
                    <Chip compact icon="star">
                      {t('reviews.admin.featured')}
                    </Chip>
                  ) : null}
                </View>
              ) : null}
              {r.text ? <Text variant="bodyMedium">{r.text}</Text> : null}
            </Card.Content>
            <Card.Actions style={{ flexWrap: 'wrap' }}>
              <Button
                compact
                disabled={moderate.isPending}
                icon={r.status === 'visible' ? 'eye-off-outline' : 'eye-outline'}
                onPress={() =>
                  moderate.mutate({
                    reviewId: r.id,
                    status: r.status === 'visible' ? 'hidden' : 'visible',
                  })
                }
              >
                {r.status === 'visible' ? t('reviews.admin.hide') : t('reviews.admin.show')}
              </Button>
              <Button
                compact
                disabled={moderate.isPending}
                icon={r.featured ? 'star' : 'star-outline'}
                onPress={() => moderate.mutate({ reviewId: r.id, featured: !r.featured })}
              >
                {r.featured ? t('reviews.admin.unfeature') : t('reviews.admin.feature')}
              </Button>
              <Button
                compact
                disabled={moderate.isPending}
                textColor={theme.colors.error}
                onPress={() => setDeleting(r)}
              >
                {t('reviews.admin.delete')}
              </Button>
            </Card.Actions>
          </Card>
        )}
      />
      <ConfirmDialog
        visible={!!deleting}
        title={t('reviews.admin.delete')}
        message={t('reviews.admin.confirmDelete')}
        onDismiss={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) moderate.mutate({ reviewId: deleting.id, remove: true });
          setDeleting(undefined);
        }}
      />
      <Snackbar visible={notice !== null} onDismiss={() => setNotice(null)} duration={3000}>
        {notice ?? ''}
      </Snackbar>
    </>
  );
}
