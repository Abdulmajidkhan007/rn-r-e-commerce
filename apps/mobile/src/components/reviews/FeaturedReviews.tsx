import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useFeaturedReviews } from '@kidswear/data';
import { useTranslation } from '@kidswear/i18n';
import { ReviewCard } from './ReviewCard';

/** Home "Mijozlar fikri": admin-featured visible reviews, swiped sideways; hidden when empty. */
export function FeaturedReviews(): React.ReactElement | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data: reviews = [] } = useFeaturedReviews();
  if (reviews.length === 0) return null;

  // One card and a peek of the next on phones; capped on tablets.
  const cardWidth = Math.min(width * 0.8, 360);

  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          {t('reviews.featuredTitle')}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('reviews.featuredSubtitle')}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {reviews.map((review) => (
          <View key={review.id} style={{ width: cardWidth }}>
            <ReviewCard review={review} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
